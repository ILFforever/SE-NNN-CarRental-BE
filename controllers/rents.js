const Rent = require("../models/Rent");
const Car = require("../models/Car");
const User = require("../models/User");
const Service = require("../models/Service");
const Car_Provider = require("../models/Car_Provider");
const asyncHandler = require("express-async-handler");
const mongoose = require('mongoose');

// @desc    Get user's rents (for regular users)
// @route   GET /api/v1/rents
// @access  Private
exports.getUserRents = asyncHandler(async (req, res, next) => {
  // Parse pagination parameters from query string
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  // Build query to find only this user's rentals
  const query = Rent.find({ user: req.user.id });

  // Apply sorting - newest first
  query.sort({ createdAt: -1 });

  // Count total documents for pagination info
  const total = await Rent.countDocuments({ user: req.user.id });

  // Apply pagination
  query.skip(startIndex).limit(limit);

  // Add relationships
  query.populate({
    path: "car",
    select:
      "license_plate brand type model color manufactureDate available dailyRate tier provider_id images",
  });

  // Execute query
  const rents = await query;

  // Prepare pagination info
  const pagination = {};

  // Add next page info if available
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  // Add previous page info if available
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  // Send response with pagination metadata
  res.status(200).json({
    success: true,
    count: rents.length,
    totalCount: total,
    pagination,
    data: rents,
  });
});


// @desc    Get all rents (for admins)
// @route   GET /api/v1/rents/all
// @access  Private/Admin
exports.getAllRents = asyncHandler(async (req, res, next) => {
  let query;

  // Filter by car ID if provided
  if (req.params.carId) {
    query = Rent.find({ car: req.params.carId });
  } else {
    // Get all rents
    query = Rent.find();
  }

  // Add relationships
  query = query
    .populate({
      path: "car",
      select:
        "license_plate brand type model color manufactureDate available dailyRate tier provider_id",
    })
    .populate({
      path: "user",
      select: "name email telephone_number role",
    });
    
  // Apply sorting - prioritize active/pending/unpaid rentals, then newest first
  // If custom sort is provided, use that instead
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    // Use aggregation pipeline for custom sorting
    const aggregatePipeline = [
      // Match by car ID if provided
      ...(req.params.carId ? [{ $match: { car: mongoose.Types.ObjectId(req.params.carId) } }] : []),
      
      // Add a field for status priority
      {
        $addFields: {
          statusPriority: {
            $switch: {
              branches: [
                { case: { $in: ["$status", ["active", "pending", "unpaid"]] }, then: 1 },
                { case: { $eq: ["$status", "completed"] }, then: 2 },
                { case: { $eq: ["$status", "cancelled"] }, then: 3 },
              ],
              default: 4
            }
          }
        }
      },
      
      // Sort by status priority, then by newest
      { $sort: { statusPriority: 1, createdAt: -1 } },
      
      // Lookup to populate car data
      {
        $lookup: {
          from: "cars",
          localField: "car",
          foreignField: "_id",
          as: "carDetails"
        }
      },
      { $unwind: { path: "$carDetails", preserveNullAndEmptyArrays: true } },
      
      // Lookup to populate user data
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      
      // Project the final structure
      {
        $project: {
          _id: 1,
          startDate: 1,
          returnDate: 1,
          actualReturnDate: 1,
          status: 1,
          price: 1,
          servicePrice: 1,
          discountAmount: 1,
          finalPrice: 1,
          additionalCharges: 1,
          notes: 1,
          service: 1,
          createdAt: 1,
          isRated: 1,
          car: {
            _id: "$carDetails._id",
            license_plate: "$carDetails.license_plate",
            brand: "$carDetails.brand",
            model: "$carDetails.model",
            type: "$carDetails.type",
            color: "$carDetails.color",
            manufactureDrage: "$carDetails.manufactureDate",
            available: "$carDetails.available",
            dailyRate: "$carDetails.dailyRate",
            tier: "$carDetails.tier",
            provider_id: "$carDetails.provider_id"
          },
          user: {
            _id: "$userDetails._id",
            name: "$userDetails.name", 
            email: "$userDetails.email",
            telephone_number: "$userDetails.telephone_number",
            role: "$userDetails.role"
          }
        }
      }
    ];
    
    try {
      const sortedRents = await Rent.aggregate(aggregatePipeline);
      
      return res.status(200).json({
        success: true,
        count: sortedRents.length,
        data: sortedRents,
      });
    } catch (err) {
      console.error(`Error with aggregation: ${err.message}`);
      // Fallback to regular query with simpler sorting if aggregation fails
      query = query.sort({
        // Custom sort by status priority
        status: {
          $cond: {
            if: { $in: ["$status", ["active", "pending", "unpaid"]] },
            then: 1,
            else: {
              $cond: {
                if: { $eq: ["$status", "completed"] },
                then: 2,
                else: 3 // cancelled
              }
            }
          }
        },
        createdAt: -1 // Then by newest first
      });
    }
  }

  const rents = await query;

  res.status(200).json({
    success: true,
    count: rents.length,
    data: rents,
  });
});

// @desc    Get single rent
// @route   GET /api/v1/rents/:id
// @access  Private
exports.getRent = asyncHandler(async (req, res, next) => {
  // First, find the rental without populated fields to check authorization
  const baseRent = await Rent.findById(req.params.id);

  if (!baseRent) {
    return res.status(404).json({
      success: false,
      message: `No rent with the id of ${req.params.id}`,
    });
  }

  // Check if the user is authorized to view this rent
  let isAuthorized = false;
  let isProvider = false;

  if (req.user) {
    // Admin can view all rentals
    if (req.user.role === "admin") {
      isAuthorized = true;
    }
    // Users can view their own rentals
    else if (baseRent.user.toString() === req.user.id) {
      isAuthorized = true;
    }
  }

  // Provider authorization check
  if (req.provider) {
    isProvider = true;
    // Check if car belongs to this provider
    const car = await Car.findById(baseRent.car);

    if (car && car.provider_id.toString() === req.provider.id) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      message: `Not authorized to view this rental`,
    });
  }

  // Now fetch the full rental with appropriate populated fields
  let populatedRent;

  if (isProvider) {
    // For providers, include basic user info
    populatedRent = await Rent.findById(req.params.id)
      .populate({
        path: "car",
        select:
          "license_plate brand type model color manufactureDate available dailyRate tier provider_id images",
      })
      .populate({
        path: "user",
        select: "name email telephone_number", // Only essential user data
      });
  } else {
    // For admin and customers, include all fields
    populatedRent = await Rent.findById(req.params.id).populate({
      path: "car",
      select:
        "license_plate brand type model color manufactureDate available dailyRate tier provider_id images",
    });

    // For admin, populate user data too
    if (req.user && req.user.role === "admin") {
      await populatedRent.populate({
        path: "user",
        select: "name email telephone_number role",
      });
    }
  }

  // Return the populated rental data
  res.status(200).json({
    success: true,
    data: populatedRent,
  });
});

// @desc    Get rentals for provider's cars
// @route   GET /api/v1/rents/provider
// @access  Private/Provider
exports.getProviderRents = asyncHandler(async (req, res) => {
    // Only allow car providers to access this route
    if (!req.provider) {
        return res.status(403).json({
            success: false,
            message: "Only car providers can access this route",
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
                totalCount: 0,
                pagination: {},
                data: [],
            });
        }

        // Get car IDs correctly using new ObjectId()
        const carIds = providerCars.map((car) => new mongoose.Types.ObjectId(car._id));

        // Pagination parameters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        // Build base query parameters from request
        let matchStage = { car: { $in: carIds } };

        // Apply status filter if provided
        if (req.query.status) {
            matchStage.status = req.query.status;
        }

        // Apply date range filters
        if (req.query.startDate || req.query.endDate) {
            matchStage.$or = [];

            if (req.query.startDate) {
                matchStage.$or.push({
                    startDate: { $gte: new Date(req.query.startDate) }
                });
            }

            if (req.query.endDate) {
                matchStage.$or.push({
                    returnDate: { $lte: new Date(req.query.endDate) }
                });
            }
        }

        // Build aggregation pipeline
        const aggregatePipeline = [
            // Initial match stage to filter for provider's cars
            { $match: matchStage },

            // Add a field for status priority
            {
                $addFields: {
                    statusPriority: {
                        $switch: {
                            branches: [
                                { case: { $in: ["$status", ["active", "pending", "unpaid"]] }, then: 1 },
                                { case: { $eq: ["$status", "completed"] }, then: 2 },
                                { case: { $eq: ["$status", "cancelled"] }, then: 3 },
                            ],
                            default: 4
                        }
                    }
                }
            },

            // Lookup to populate car details fully
            {
                $lookup: {
                    from: "cars",
                    localField: "car",
                    foreignField: "_id",
                    as: "carDetails"
                }
            },
            { $unwind: { path: "$carDetails", preserveNullAndEmptyArrays: true } },

            // Custom sorting
            { 
                $sort: { 
                    statusPriority: 1, 
                    createdAt: -1 
                } 
            },

            // Pagination stages
            { $skip: startIndex },
            { $limit: limit },

            // Project final structure to match exact format
            {
                $project: {
                    _id: 1,
                    startDate: 1,
                    returnDate: 1,
                    actualReturnDate: 1,
                    status: 1,
                    price: 1,
                    servicePrice: 1,
                    discountAmount: 1,
                    finalPrice: 1,
                    user: 1,
                    service: 1,
                    isRated: 1,
                    createdAt: 1,
                    __v: 1,
                    notes: 1,
                    additionalCharges: 1,
                    car: {
                        _id: "$carDetails._id",
                        license_plate: "$carDetails.license_plate",
                        brand: "$carDetails.brand",
                        provider_id: "$carDetails.provider_id",
                        model: "$carDetails.model",
                        type: "$carDetails.type",
                        color: "$carDetails.color",
                        manufactureDate: "$carDetails.manufactureDate",
                        available: "$carDetails.available",
                        dailyRate: "$carDetails.dailyRate",
                        tier: "$carDetails.tier",
                        images: "$carDetails.images",
                        id: "$carDetails._id"
                    }
                }
            }
        ];

        // Execute the aggregation pipeline
        const rents = await Rent.aggregate(aggregatePipeline);

        // Count total matching documents for pagination
        const totalCount = await Rent.countDocuments(matchStage);

        // Prepare pagination info
        const pagination = {};
        if (startIndex + limit < totalCount) {
            pagination.next = {
                page: page + 1,
                limit,
            };
        }

        res.status(200).json({
            success: true,
            count: rents.length,
            totalCount,
            pagination,
            data: rents,
        });
    } catch (err) {
        console.error(`Error fetching provider rentals: ${err.message}`);
        console.error(err.stack);  // Added to provide more detailed error information
        res.status(500).json({
            success: false,
            message: "Server error while fetching provider rentals",
        });
    }
});

// @desc    Add rent
// @route   POST /api/v1/rents
// @access  Private
exports.addRent = asyncHandler(async (req, res, next) => {
  // Allow admins to rent for others, otherwise, force req.user.id
  if (req.user.role === "admin" && req.body.user) {
    req.body.user = req.body.user; // Admin specifies user
  } else {
    req.body.user = req.user.id; // Regular users can only rent for themselves
  }

  // Fetch the user renting the car
  const user = await User.findById(req.body.user);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Check if the user already has 3 active/pending rentals (Admins can bypass this)
  const existingRents = await Rent.find({
    user: req.body.user,
    status: { $in: ["active", "pending", "unpaid"] },
  });

  if (existingRents.length >= 3 && req.user.role !== "admin") {
    return res
      .status(400)
      .json({
        success: false,
        message: `User with ID ${req.body.user} already has 3 active rentals`,
      });
  }

  const {
    car: carId,
    startDate,
    returnDate,
    price,
    service,
    discountAmount,
  } = req.body;

  if (!carId || !startDate || !returnDate || !price) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Please provide a car ID, start date, end date, and price",
      });
  }

  const car = await Car.findById(carId);
  if (!car) {
    return res
      .status(404)
      .json({ success: false, message: `No car with the ID ${carId}` });
  }

  // Check tier restriction (Admins bypass this check)
  if (req.user.role !== "admin" && user.tier < car.tier) {
    return res
      .status(400)
      .json({
        success: false,
        message: `User's tier (${user.tier}) is too low to rent this car (Tier ${car.tier})`,
      });
  }

  const start = new Date(startDate).toISOString();
  const end = new Date(returnDate).toISOString();
  const duration =
    Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1; // to match FE
  if (duration <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "End date must be after start date" });
  }

  // Calculate service price if services are selected
  let servicePrice = 0;
  if (service && service.length > 0) {
    // Fetch service details to get their rates
    const services = await Service.find({ _id: { $in: service } });

    // Calculate total service price based on duration and service type (daily vs one-time)
    if (services.length > 0) {
      servicePrice = services.reduce((total, svc) => {
        // For daily services, multiply by duration; for one-time services, add just once
        return total + (svc.daily ? svc.rate * duration : svc.rate);
      }, 0);
    }
  }

  // Calculate discount amount based on user tier, if not provided
  const tierDiscountRate = [0, 5, 10, 15, 20][user.tier] || 0; // Tier discount percentage lookup
  const calculatedDiscountAmount =
    ((price + servicePrice) * tierDiscountRate) / 100 || 0;

  // Use provided discountAmount or calculate it
  const finalDiscountAmount =
    discountAmount !== undefined ? discountAmount : calculatedDiscountAmount;

  // Calculate final price
  const finalPrice = price + servicePrice - finalDiscountAmount;

  // Set values for the rent
  req.body.price = price;
  req.body.servicePrice = servicePrice;
  req.body.discountAmount = finalDiscountAmount;
  req.body.finalPrice = finalPrice;
  req.body.startDate = start;
  req.body.returnDate = end;

  const rent = await Rent.create(req.body);
  //await Car.findByIdAndUpdate(rent.car, { available: false });

  res.status(201).json({
    success: true,
    totalPrice: finalPrice,
    data: rent,
  });
});

// @desc    Update rent
// @route   PUT /api/v1/rents/:id
// @access  Private
// Updated updateRent function with provider access
exports.updateRent = asyncHandler(async (req, res, next) => {
  let rent = await Rent.findById(req.params.id).populate({
    path: "car",
    select: "provider_id",
  });

  if (!rent) {
    return res
      .status(404)
      .json({
        success: false,
        message: `No rent with the id of ${req.params.id}`,
      });
  }

  // Check authorization for users
  let isAuthorized = false;

  if (req.user) {
    // Regular users can only update their own rentals
    if (rent.user.toString() === req.user.id) {
      isAuthorized = true;
    }
    // Admins can update any rental
    else if (req.user.role === "admin") {
      isAuthorized = true;
    }
  }

  // Check authorization for providers - they can update rentals for their cars
  if (req.provider) {
    // If car is populated, check directly
    if (typeof rent.car === "object" && rent.car.provider_id) {
      if (rent.car.provider_id.toString() === req.provider.id) {
        isAuthorized = true;
      }
    }
    // If car is just an ID, we need to fetch the car
    else if (typeof rent.car === "string") {
      const car = await Car.findById(rent.car);
      if (car && car.provider_id.toString() === req.provider.id) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      message: `Not authorized to update this rental`,
    });
  }

  rent = await Rent.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: rent,
  });
});

// @desc    Delete rent
// @route   DELETE /api/v1/rents/:id
// @access  Private
exports.deleteRent = asyncHandler(async (req, res, next) => {
  const rent = await Rent.findById(req.params.id);

  if (!rent) {
    return res
      .status(404)
      .json({
        success: false,
        message: `No rent with the id of ${req.params.id}`,
      });
  }

  if (rent.user.toString() !== req.user.id && req.user.role !== "admin") {
    return res
      .status(401)
      .json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this rent`,
      });
  }

  await rent.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Complete rent (return car) - now changes status to "unpaid" instead of "completed"
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

  // Check if rental is already in a final state
  if (rent.status === 'completed' || rent.status === 'cancelled' || rent.status === 'unpaid') {
    return res.status(400).json({
      success: false,
      message: `Rent has already been ${rent.status}`
    });
  }

  const today = new Date();
  const actualReturnDate = today.toISOString();
  const returnDate = new Date(rent.returnDate);

  let user = await User.findById(rent.user);
  if (user) {
    // Include the finalPrice in the total spend calculation
    const totalSpend = rent.finalPrice || (rent.price + (rent.servicePrice || 0) - (rent.discountAmount || 0));
    user.total_spend += totalSpend;
    await user.save(); // This triggers pre-save middleware
  }
 
  const carInfo = await Car.findByIdAndUpdate(rent.car, { available: true });
  let daysLate = 0;
  let lateFee = 0;
  if (today > returnDate) {
    daysLate = Math.ceil((today - returnDate) / (1000 * 60 * 60 * 24));
    lateFee = (rent.car.tier + 1) * 500 * daysLate;
  } 
  
  // Calculate total price including late fees
  const baseRentalCost = rent.price + (rent.servicePrice || 0) - (rent.discountAmount || 0);
  const finalPriceWithLateFees = baseRentalCost + lateFee;

  // Update the rent with completion details
  // Changed status to "unpaid" instead of "completed"
  let updateData = { 
    status: 'unpaid', // Changed from 'completed' to 'unpaid'
    actualReturnDate: new Date(),
    ...req.body
  };

  // Add late fees if applicable
  if (lateFee > 0) {
    updateData.additionalCharges = {
      ...(rent.additionalCharges || {}),
      lateFee: lateFee
    };
    updateData.finalPrice = finalPriceWithLateFees;
  }

  rent = await Rent.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  // Detect provider car equal with 10
  const providerProfile = await Car_Provider.findByIdAndUpdate(
    carInfo.provider_id,
    { $inc: { completeRent: 1 } },
    { new: true }
  )

  if (providerProfile.completeRent == 10) {
    await Car_Provider.findByIdAndUpdate(
      carInfo.provider_id,
      { $set: { verified: true } },
      { new: true }
    )
  }

  res.status(200).json({
    success: true,
    late_by: daysLate > 0 ? daysLate : 0,
    late_fee: lateFee > 0 ? lateFee : 0,
    service_price: rent.servicePrice || 0,
    discount_amount: rent.discountAmount || 0,
    car_tier: rent.car.tier,
    final_price: rent.finalPrice || finalPriceWithLateFees,
    data: rent,
    message: 'Rental marked as unpaid successfully' // Added a message to indicate new status
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
      message: `No rent with the id of ${req.params.id}`,
    });
  }

  // Check authorization
  // If admin, allow any confirmation
  // If provider, only allow if the car belongs to them
  if (req.user?.role !== "admin") {
    // If not admin, check if it's a provider
    if (!req.provider) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to confirm this rental",
      });
    }

    // Get the car to check if it belongs to this provider
    const car = await Car.findById(rent.car);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    // Check if the car belongs to this provider
    if (car.provider_id.toString() !== req.provider.id) {
      return res.status(403).json({
        success: false,
        message: "You can only confirm rentals for your own cars",
      });
    }
  }

  if (rent.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Only pending rentals can be confirmed. Current status: ${rent.status}`,
    });
  }

  // Update the car's availability status to false
  //await Car.findByIdAndUpdate(rent.car, { available: false });

  // Set status to active
  rent = await Rent.findByIdAndUpdate(
    req.params.id,
    {
      status: "active",
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: rent,
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
      message: `No rent with the id of ${req.params.id}`,
    });
  }

  // Check authorization
  let isAuthorized = false;

  if (req.user && req.user.role === "admin") {
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
      message: "Not authorized to cancel this rental",
    });
  }

  // Only pending or active rentals can be cancelled
  if (rent.status !== "pending" && rent.status !== "active") {
    return res.status(400).json({
      success: false,
      message: `Only pending or active rentals can be cancelled. Current status: ${rent.status}`,
    });
  }

  // If the rental was active, make the car available again
  // if (rent.status === 'active') {
  //   await Car.findByIdAndUpdate(rent.car, { available: true });
  // }

  // Set status to cancelled
  rent = await Rent.findByIdAndUpdate(
    req.params.id,
    {
      status: "cancelled",
      ...req.body, // Allow additional fields to be updated
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: rent,
  });
});

// @desc    Rate a car provider
// @route   POST /api/v1/rents/:id/rate
// @access  Private
exports.rateProvider = asyncHandler(async (req, res, next) => {
  const { rating } = req.body;

  // Validate rating
  if (!rating || ![1, 2, 3, 4, 5].includes(rating)) {
    return res.status(400).json({
      success: false,
      message: "Rating must be a number between 1 and 5",
    });
  }

  // Find the rent
  const rent = await Rent.findById(req.params.id).populate({
    path: "car",
    select: "provider_id",
  });

  if (!rent) {
    return res.status(404).json({
      success: false,
      message: `No rent found with the id of ${req.params.id}`,
    });
  }

  // Ensure the rent is completed
  if (rent.status !== "completed") {
    return res.status(400).json({
      success: false,
      message: "You can only rate a provider for completed rentals",
    });
  }

  // Ensure the user is the owner of the rent
  if (rent.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to rate this rental",
    });
  }

  // Ensure the user has not already rated this rent
  if (rent.isRated) {
    return res.status(400).json({
      success: false,
      message: "You have already rated this provider for this rental",
    });
  }

  // Find the provider
  const provider = await Car_Provider.findById(rent.car.provider_id);
  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Provider not found",
    });
  }

  // Update provider's rating
  provider.review.totalReviews += 1;
  provider.review.averageRating =
    (provider.review.averageRating * (provider.review.totalReviews - 1) +
      rating) /
    provider.review.totalReviews;

  provider.review.ratingDistribution.set(
    rating.toString(),
    (provider.review.ratingDistribution.get(rating.toString()) || 0) + 1
  );

  await provider.save();

  // Mark the rent as rated
  rent.isRated = true;
  await rent.save();

  res.status(200).json({
    success: true,
    message: "Provider rated successfully",
    data: provider.review,
  });
});

// @desc    Mark rental as paid (change from unpaid to completed)
// @route   PUT /api/v1/rents/:id/paid
// @access  Private/Admin/Provider
exports.markAsPaid = asyncHandler(async (req, res, next) => {
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
    // Admin can mark any rental as paid
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
      message: 'Not authorized to mark this rental as paid'
    });
  }

  // Only unpaid rentals can be marked as completed
  if (rent.status !== 'unpaid') {
    return res.status(400).json({
      success: false,
      message: `Only unpaid rentals can be marked as paid. Current status: ${rent.status}`
    });
  }

  // Set status to completed
  rent = await Rent.findByIdAndUpdate(req.params.id, { 
    status: 'completed',
    ...req.body // Allow additional fields to be updated (like payment reference, etc.)
  }, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: rent,
    message: 'Rental marked as paid and completed successfully'
  });
});