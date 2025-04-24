const Car_Provider = require('../models/Car_Provider');
const asyncHandler = require('express-async-handler');
const Car = require('../models/Car');
const ValidToken = require('../models/ValidToken');
const Rent = require('../models/Rent');

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
            cars,
            review: provider.review
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
        password,
        verified: false,
        completeRent: 0
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

// @desc    Verify Provider from Administrator
// @route   POST /api/providers/:id/verify
// @access  Private
exports.verifyProvider = asyncHandler(async (req, res) => {
    const provider = await Car_Provider.findById(req.params.id);
    let { verified } = req.body;
    if (!provider) {
        return res.status(404).json({
            success: false,
            error: `Car provider not found with id of ${req.params.id}`
        });
    }

    if (verified === undefined) {
        verified = true;
    }

    // Update verify status
    const result = await Car_Provider.findByIdAndUpdate(req.params.id, { verified }, {
        new: true,
        runValidators: true
    });

    return res.status(200).json({
        success: true,
        data: result
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

// Add this function to controllers/Car_Provider.js

// @desc    Get provider dashboard data
// @route   GET /api/v1/Car_Provider/dashboard
// @access  Private/Provider
exports.getProviderDashboard = asyncHandler(async (req, res) => {
    try {
      // Only allow car providers to access this route
      if (!req.provider) {
        return res.status(403).json({
          success: false,
          message: "Only car providers can access this route"
        });
      }
  
      const providerId = req.provider.id;
  
      // Find all cars belonging to this provider
      const cars = await Car.find({ provider_id: providerId });
      
      // Calculate summary stats
      const totalCars = cars.length;
      const availableCars = cars.filter(car => car.available).length;
      const rentedCars = totalCars - availableCars;
  
      // Get car types breakdown
      const carTypesCounts = {};
      cars.forEach(car => {
        if (!carTypesCounts[car.type]) {
          carTypesCounts[car.type] = 0;
        }
        carTypesCounts[car.type]++;
      });
      
      // Format car types for frontend display
      const carTypes = Object.entries(carTypesCounts).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter
        count
      }));
  
      // Find active and pending rentals for provider's cars
      const carIds = cars.map(car => car._id);
      
      const activeRentals = await Rent.find({ 
        car: { $in: carIds },
        status: 'active'
      }).populate('car user');
      
      const pendingRentals = await Rent.find({ 
        car: { $in: carIds },
        status: 'pending'
      }).populate('car user');
  
      // Calculate monthly revenue
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const completedRentalsThisMonth = await Rent.find({
        car: { $in: carIds },
        status: 'completed',
        actualReturnDate: { $gte: firstDayOfMonth }
      });
      
      const monthlyRevenue = completedRentalsThisMonth.reduce((sum, rental) => 
        sum + (rental.finalPrice || rental.price), 0);
  
      // Get recent rentals (completed, active, or pending) - limit to 5
      const recentRentals = await Rent.find({
        car: { $in: carIds },
        status: { $in: ['completed', 'active', 'pending'] }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: 'car',
        select: 'brand model license_plate type'
      })
      .populate({
        path: 'user',
        select: 'name email telephone_number'
      });
  
      // Format recent rentals for display
      const formattedRecentRentals = recentRentals.map(rental => ({
        id: rental._id,
        status: rental.status,
        startDate: rental.startDate,
        returnDate: rental.returnDate,
        price: rental.finalPrice || rental.price,
        customer: {
          name: rental.user.name,
          email: rental.user.email
        },
        car: {
          brand: rental.car.brand,
          model: rental.car.model,
          licensePlate: rental.car.license_plate
        }
      }));
  
      // Calculate rental stats if any completed rentals exist
      const completedRentals = await Rent.find({
        car: { $in: carIds },
        status: 'completed'
      });
  
      let rentalStats = null;
      if (completedRentals.length > 0) {
        const totalRentals = completedRentals.length;
        const totalRevenue = completedRentals.reduce((sum, rental) => 
          sum + (rental.finalPrice || rental.price), 0);
        
        // Calculate average rental duration in days
        const avgDuration = completedRentals.reduce((sum, rental) => {
          const start = new Date(rental.startDate);
          const end = new Date(rental.actualReturnDate || rental.returnDate);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / totalRentals;
  
        rentalStats = {
          totalRentals,
          totalRevenue,
          avgDuration: Math.round(avgDuration * 10) / 10, // Round to 1 decimal place
          avgRentalValue: Math.round((totalRevenue / totalRentals) * 100) / 100
        };
      }
  
      // Return the dashboard data
      res.status(200).json({
        success: true,
        data: {
          totalCars,
          availableCars,
          rentedCars,
          carTypes,
          activeRentals: {
            count: activeRentals.length,
            list: activeRentals.map(rental => ({
              id: rental._id,
              startDate: rental.startDate,
              returnDate: rental.returnDate,
              customerName: rental.user.name,
              car: `${rental.car.brand} ${rental.car.model}`
            }))
          },
          pendingRentals: {
            count: pendingRentals.length,
            list: pendingRentals.map(rental => ({
              id: rental._id,
              startDate: rental.startDate,
              returnDate: rental.returnDate,
              customerName: rental.user.name,
              car: `${rental.car.brand} ${rental.car.model}`
            }))
          },
          monthlyRevenue: {
            amount: monthlyRevenue,
            count: completedRentalsThisMonth.length
          },
          recentRentals: formattedRecentRentals,
          rentalStats
        }
      });
      
    } catch (error) {
      console.error('Provider dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching dashboard data'
      });
    }
  });