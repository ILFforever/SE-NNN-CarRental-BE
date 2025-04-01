const Rent = require('../models/Rent');
const Car = require('../models/Car');
const User = require('../models/User');
const Car_Provider = require('../models/Car_Provider');
const asyncHandler = require('express-async-handler');

// @desc    Get user's rents (for regular users)
// @route   GET /api/v1/rents
// @access  Private
exports.getUserRents = asyncHandler(async (req, res, next) => {
    // Only return rents belonging to the logged-in user
    const query = Rent.find({ user: req.user.id }).populate({
        path: 'car',
        select: 'license_plate brand type model color manufactureDate available dailyRate tier provider_id'
    });

    const rents = await query;

    res.status(200).json({
        success: true,
        count: rents.length,
        data: rents
    });
});

// @desc    Get all rents (for admins)
// @route   GET /api/v1/rents/all
// @access  Private/Admin
exports.getAllRents = asyncHandler(async (req, res, next) => {
    let query;

    // Filter by car ID if provided
    if (req.params.carId) {
        query = Rent.find({ car: req.params.carId }).populate({
            path: 'car',
            select: 'license_plate brand type model color manufactureDate available dailyRate tier provider_id'
        });
    } else {
        // Get all rents
        query = Rent.find().populate({
            path: 'car',
            select: 'license_plate brand type model color manufactureDate available dailyRate tier provider_id'
        }).populate({
            path: 'user',
            select: 'name email telephone_number role'
        });
    }

    const rents = await query;

    res.status(200).json({
        success: true,
        count: rents.length,
        data: rents
    });
});

// @desc    Get single rent
// @route   GET /api/v1/rents/:id
// @access  Private
exports.getRent = asyncHandler(async (req, res, next) => {
    const rent = await Rent.findById(req.params.id).populate({
        path: 'car',
        select: 'license_plate brand type model color manufactureDate available dailyRate tier provider_id'
    });

    if (!rent) {
        return res.status(404).json({ success: false, message: `No rent with the id of ${req.params.id}` });
    }

    // Check if the user is authorized to view this rent
    if (rent.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to view this rent` });
    }

    res.status(200).json({
        success: true,
        data: rent
    });
});

// Add this function to controllers/rents.js

// @desc    Get rentals for provider's cars
// @route   GET /api/v1/rents/provider
// @access  Private/Provider
exports.getProviderRents = asyncHandler(async (req, res, next) => {
    // Only allow car providers to access this route
    if (!req.provider) {
      return res.status(403).json({
        success: false,
        message: 'Only car providers can access this route'
      });
    }
  
    const providerId = req.provider.id;
  
    try {
      // First, find all cars belonging to this provider
      const providerCars = await Car.find({ provider_id: providerId });
      
      if (!providerCars || providerCars.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: []
        });
      }
      
      // Get car IDs
      const carIds = providerCars.map(car => car._id);
      
      // Build query to find rentals for these cars
      let query = Rent.find({ car: { $in: carIds } });
      
      // Apply filters if provided
      if (req.query.status) {
        query = query.find({ status: req.query.status });
      }
      
      // Apply date filters if provided
      if (req.query.startDate) {
        query = query.find({ 
          startDate: { $gte: new Date(req.query.startDate) } 
        });
      }
      
      if (req.query.endDate) {
        query = query.find({ 
          returnDate: { $lte: new Date(req.query.endDate) } 
        });
      }
      
      // Apply sorting
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt'); // Default: newest first
      }
      
      // Pagination
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 25;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const total = await Rent.countDocuments(query.getQuery());
      
      query = query.skip(startIndex).limit(limit);
      
      // Add relationships - populate car and user details
      query = query.populate({
        path: 'car',
        select: 'license_plate brand model type color dailyRate tier'
      }).populate({
        path: 'user',
        select: 'name email telephone_number'
      });
      
      // Execute query
      const rents = await query;
      
      // Prepare pagination info
      const pagination = {};
      
      if (endIndex < total) {
        pagination.next = {
          page: page + 1,
          limit
        };
      }
      
      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit
        };
      }
      
      // Send response
      res.status(200).json({
        success: true,
        count: rents.length,
        pagination,
        totalCount: total,
        data: rents
      });
    } catch (err) {
      console.error(`Error fetching provider rentals: ${err.message}`);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching provider rentals'
      });
    }
  });

  
// @desc    Add rent
// @route   POST /api/v1/rents
// @access  Private
exports.addRent = asyncHandler(async (req, res, next) => {
    // Allow admins to rent for others, otherwise, force req.user.id
    if (req.user.role === 'admin' && req.body.user) {
        req.body.user = req.body.user; // Admin specifies user
    } else {
        req.body.user = req.user.id; // Regular users can only rent for themselves
    }

    // Fetch the user renting the car
    const user = await User.findById(req.body.user);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the user already has 3 active/pending rentals (Admins can bypass this)
    const existingRents = await Rent.find({ 
        user: req.body.user, 
        status: { $in: ['active', 'pending'] }
    });

    if (existingRents.length >= 3 && req.user.role !== 'admin') {
        return res.status(400).json({ success: false, message: `User with ID ${req.body.user} already has 3 active rentals` });
    }

    const { car: carId, startDate, returnDate } = req.body;
    
    if (!carId || !startDate || !returnDate) {
        return res.status(400).json({ success: false, message: 'Please provide a car ID, start date, and end date' });
    }

    const car = await Car.findById(carId);
    if (!car) {
        return res.status(404).json({ success: false, message: `No car with the ID ${carId}` });
    }

    // Check tier restriction (Admins bypass this check)
    if (req.user.role !== 'admin' && user.tier < car.tier) {
        return res.status(400).json({ success: false, message: `User's tier (${user.tier}) is too low to rent this car (Tier ${car.tier})` });
    }

    // Check if the car is already rented
    const carIsRented = await Rent.findOne({
        car: carId,
        status: { $in: ['active', 'pending'] },
        returnDate: { $gt:  req.body.startDate }
    });

    if (carIsRented) {
        return res.status(400).json({ success: false, message: `Car is currently unavailable for rent` });
    }

    const start = new Date(startDate).toISOString();
    const end = new Date(returnDate).toISOString();
    const duration = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

    if (duration <= 0) {
        return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    const totalPrice = duration * car.dailyRate;
    req.body.price = totalPrice;
    req.body.startDate = start;
    req.body.returnDate = end;

    const rent = await Rent.create(req.body);
    await Car.findByIdAndUpdate(rent.car, { available: false });
    res.status(201).json({
        success: true,
        totalPrice: totalPrice,
        data: rent
    });
});

// @desc    Update rent
// @route   PUT /api/v1/rents/:id
// @access  Private
exports.updateRent = asyncHandler(async (req, res, next) => {
    let rent = await Rent.findById(req.params.id);

    if (!rent) {
        return res.status(404).json({ success: false, message: `No rent with the id of ${req.params.id}` });
    }

    if (rent.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to update this rent` });
    }

    rent = await Rent.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: rent
    });
});

// @desc    Delete rent
// @route   DELETE /api/v1/rents/:id
// @access  Private
exports.deleteRent = asyncHandler(async (req, res, next) => {
    const rent = await Rent.findById(req.params.id);

    if (!rent) {
        return res.status(404).json({ success: false, message: `No rent with the id of ${req.params.id}` });
    }

    if (rent.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: `User ${req.user.id} is not authorized to delete this rent` });
    }

    await rent.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Complete rent (return car)
// @route   PUT /api/v1/rents/:id/complete
// @access  Private
exports.completeRent = asyncHandler(async (req, res, next) => {
    let rent = await Rent.findById(req.params.id).populate({
      path: 'car',
      select: 'tier' // Ensure the tier field is included
    });
  
    if (!rent) {
      return res.status(404).json({
        success: false,
        message: `No rent with the id of ${req.params.id}`
      });
    }
  
    // Check authorization:
    // 1. User can complete their own rental
    // 2. Admin can complete any rental
    // 3. Provider can complete rentals for their cars
    let isAuthorized = false;
  
    if (req.user) {
      if (req.user.role === 'admin') {
        // Admin can complete any rental
        isAuthorized = true;
      } else if (rent.user.toString() === req.user.id) {
        // User can complete their own rental
        isAuthorized = true;
      }
    } else if (req.provider) {
      // For provider, check if the car belongs to them
      const car = await Car.findById(rent.car);
      
      if (car && car.provider_id.toString() === req.provider.id) {
        isAuthorized = true;
      }
    }
  
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this rental'
      });
    }
  
    if (rent.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Rent has already been completed`
      });
    }
  
    const today = new Date();
    const actualReturnDate = today.toISOString();
    const returnDate = new Date(rent.returnDate);
  
    let user = await User.findById(rent.user);
    if (user) {
      user.total_spend += rent.price;
      await user.save(); // This triggers pre-save middleware
    }
   
    await Car.findByIdAndUpdate(rent.car, { available: true });
    let daysLate = 0;
    let lateFee = 0;
    if (today > returnDate) {
      daysLate = Math.ceil((today - returnDate) / (1000 * 60 * 60 * 24));
      lateFee = (rent.car.tier + 1) * 500 * daysLate;
    } 
    const totalPrice = rent.price + lateFee;
  
    rent = await Rent.findByIdAndUpdate(req.params.id, { 
      status: 'completed', 
      actualReturnDate: new Date(),
      ...req.body
    }, {
      new: true,
      runValidators: true
    });
  
    res.status(200).json({
      success: true,
      late_by: daysLate > 0 ? daysLate : 0,
      late_fee: lateFee > 0 ? lateFee : 0,
      car_tier: rent.car.tier,
      total_price: totalPrice,
      data: rent,
    });
  });
  

// @desc    Admin confirmation of rent (change status from pending to active)
// @route   PUT /api/v1/rents/:id/confirm
// @access  Private/Admin
exports.confirmRent = asyncHandler(async (req, res, next) => {
    let rent = await Rent.findById(req.params.id);
  
    if (!rent) {
      return res.status(404).json({
        success: false,
        message: `No rent with the id of ${req.params.id}`
      });
    }
  
    // Check authorization
    // If admin, allow any confirmation
    // If provider, only allow if the car belongs to them
    if (req.user?.role !== 'admin') {
      // If not admin, check if it's a provider
      if (!req.provider) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to confirm this rental'
        });
      }
  
      // Get the car to check if it belongs to this provider
      const car = await Car.findById(rent.car);
      
      if (!car) {
        return res.status(404).json({
          success: false,
          message: 'Car not found'
        });
      }
      
      // Check if the car belongs to this provider
      if (car.provider_id.toString() !== req.provider.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only confirm rentals for your own cars'
        });
      }
    }
  
    if (rent.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending rentals can be confirmed. Current status: ${rent.status}`
      });
    }
  
    // Update the car's availability status to false
    await Car.findByIdAndUpdate(rent.car, { available: false });
  
    // Set status to active
    rent = await Rent.findByIdAndUpdate(req.params.id, { 
      status: 'active'
    }, {
      new: true,
      runValidators: true
    });
  
    res.status(200).json({
      success: true,
      data: rent
    });
  });
  
  // @desc    Cancel a rental (for admins and providers)
// @route   PUT /api/v1/rents/:id/cancel
// @access  Private/Admin/Provider
exports.cancelRent = asyncHandler(async (req, res, next) => {
    let rent = await Rent.findById(req.params.id);
  
    if (!rent) {
      return res.status(404).json({
        success: false,
        message: `No rent with the id of ${req.params.id}`
      });
    }
  
    // Check authorization
    let isAuthorized = false;
  
    if (req.user && req.user.role === 'admin') {
      // Admin can cancel any rental
      isAuthorized = true;
    } else if (req.provider) {
      // For provider, check if the car belongs to them
      const car = await Car.findById(rent.car);
      
      if (car && car.provider_id.toString() === req.provider.id) {
        isAuthorized = true;
      }
    }
  
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this rental'
      });
    }
  
    // Only pending or active rentals can be cancelled
    if (rent.status !== 'pending' && rent.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Only pending or active rentals can be cancelled. Current status: ${rent.status}`
      });
    }
  
    // If the rental was active, make the car available again
    if (rent.status === 'active') {
      await Car.findByIdAndUpdate(rent.car, { available: true });
    }
  
    // Set status to cancelled
    rent = await Rent.findByIdAndUpdate(req.params.id, { 
      status: 'cancelled',
      ...req.body // Allow additional fields to be updated
    }, {
      new: true,
      runValidators: true
    });
  
    res.status(200).json({
      success: true,
      data: rent
    });
  });