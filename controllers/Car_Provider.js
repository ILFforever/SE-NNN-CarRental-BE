const Car_Provider = require('../models/Car_Provider');
const asyncHandler = require('express-async-handler');
const Car = require('../models/Car');
const ValidToken = require('../models/ValidToken');

// @desc    Get all car providers
// @route   GET /api/providers
// @access  Public
exports.getCarProviders = asyncHandler(async (req, res) => {
    const providers = await Car_Provider.find();
    res.status(200).json({
        success: true,
        count: providers.length,
        data: providers
    });
});

// @desc    Get single car provider
// @route   GET /api/providers/:id
// @access  Public
exports.getCarProvider = asyncHandler(async (req, res) => {
    // Find the car provider
    const provider = await Car_Provider.findById(req.params.id);

    if (!provider) {
        return res.status(404).json({
            success: false,
            error: `Car provider not found with id of ${req.params.id}`
        });
    }

    // Find all cars associated with this provider
    const cars = await Car.find({ provider_id: req.params.id });

    res.status(200).json({
        success: true,
        data: {
            ...provider.toObject(),
            cars
        }
    });
});

// @desc    Create new car provider
// @route   POST /api/providers
// @access  Private
exports.createCarProvider = asyncHandler(async (req, res) => {
    const provider = await Car_Provider.create(req.body);
    
    res.status(201).json({
        success: true,
        data: provider
    });
});

// @desc    Update car provider
// @route   PUT /api/providers/:id
// @access  Private
exports.updateCarProvider = asyncHandler(async (req, res) => {
    let provider = await Car_Provider.findById(req.params.id);

    if (!provider) {
        return res.status(404).json({
            success: false,
            error: `Car provider not found with id of ${req.params.id}`
        });
    }

    provider = await Car_Provider.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: provider
    });
});

// @desc    Delete car provider
// @route   DELETE /api/providers/:id
// @access  Private
exports.deleteCarProvider = asyncHandler(async (req, res) => {
    const provider = await Car_Provider.findById(req.params.id);

    if (!provider) {
        return res.status(404).json({
            success: false,
            error: `Car provider not found with id of ${req.params.id}`
        });
    }

    // First, check if there are any cars associated with this provider
    const associatedCars = await Car.find({ provider_id: req.params.id });

    // Delete all associated cars first
    if (associatedCars.length > 0) {
        await Car.deleteMany({ provider_id: req.params.id });
    }

    // Then delete the provider
    await provider.deleteOne();

    res.status(200).json({
        success: true,
        data: {},
        message: `Car provider deleted along with ${associatedCars.length} associated cars`
    });
});

// @desc    Register provider
// @route   POST /api/providers/register
// @access  Public
exports.registerProvider = asyncHandler(async (req, res) => {
    const { name, address, telephone_number, email, password } = req.body;

    // Create provider
    const provider = await Car_Provider.create({
        name,
        address,
        telephone_number,
        email,
        password
    });

    res.status(200).json({ success: true });
});

// @desc    Login provider
// @route   POST /api/providers/login
// @access  Public
exports.loginProvider = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            msg: 'Please provide an email and password'
        });
    }

    // Check for provider
    const provider = await Car_Provider.findOne({ email }).select('+password');
    if (!provider) {
        return res.status(400).json({
            success: false,
            msg: 'Invalid credentials'
        });
    }

    // Check if password matches
    const isMatch = await provider.matchPassword(password);
    if (!isMatch) {
        return res.status(401).json({
            success: false,
            msg: 'Invalid credentials'
        });
    }

    sendTokenResponse(provider, 200, res);
});

// @desc    Get current logged in provider
// @route   GET /api/providers/me
// @access  Private
exports.getCurrentProvider = asyncHandler(async (req, res) => {
    const provider = await Car_Provider.findById(req.provider.id);
    
    res.status(200).json({
        success: true,
        data: provider
    });
});

// @desc    Log provider out / clear cookie
// @route   POST /api/providers/logout
// @access  Private
exports.logoutProvider = asyncHandler(async (req, res) => {
    const token = req.cookies.token || req.headers.authorization.split(' ')[1];

    // Remove the token from the list of valid tokens
    await ValidToken.deleteOne({ token });

    res.cookie('token', 'none', {
        expires: new Date(Date.now() - 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    });

    res.status(200).json({
        success: true,
        data: {},
        message: 'Provider logged out successfully'
    });
});

// Helper function to handle token creation and response
const sendTokenResponse = async (provider, statusCode, res) => {
    // Create token
    const token = provider.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    // Save the valid token to the database
    await ValidToken.create({ token, expiresAt: options.expires });

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token
    });
};