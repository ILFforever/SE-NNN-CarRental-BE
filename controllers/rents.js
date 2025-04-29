const Rent = require("../models/Rent");
const Car = require("../models/Car");
const User = require("../models/User");
const Service = require("../models/Service");
const Car_Provider = require("../models/Car_Provider");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const { validateRateProvider } = require("../helper/rate_provider");
const { calculateRentalDuration } = require("../helper/duration_time");
const { tierCalculateDiscount } = require("../helper/tier_calc");
const { combineDateTime } = require("../helper/duration_time");

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
      limit,
    };
  }

  // Add previous page info if available
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
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

// @desc    Get rents for admin or provider
// @route   GET /api/v1/rents
// @access  Private/Admin or Private/Provider
exports.getAllRents = asyncHandler(async (req, res) => {
  const isAdmin = !!req.user?.role && req.user.role === "admin";
  const isProvider = !!req.provider;

  if (!isAdmin && !isProvider) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;

    let matchFilters = {};

    // Search query handling
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      matchFilters.$or = [
        { 'userDetails.name': searchRegex },
        { 'userDetails.email': searchRegex },
        { 'carDetails.license_plate': searchRegex },
        { 'carDetails.brand': searchRegex },
        { 'carDetails.model': searchRegex }
      ];
    }

    // If provider, filter to only their cars
    if (isProvider) {
      const providerId = req.provider.id;
      const providerCars = await Car.find({ provider_id: providerId });

      if (!providerCars.length) {
        return res.status(200).json({
          success: true,
          count: 0,
          totalCount: 0,
          pagination: {},
          data: [],
        });
      }

      const carIds = providerCars.map(
        (car) => new mongoose.Types.ObjectId(car._id)
      );
      matchFilters.car = { $in: carIds };
    }

    // Status filter
    if (req.query.status) {
      matchFilters.status = req.query.status;
    }

    // Date filters
    const dateConditions = [];
    if (req.query.startDate) {
      dateConditions.push({
        startDate: { $gte: new Date(req.query.startDate) },
      });
    }
    if (req.query.endDate) {
      dateConditions.push({
        returnDate: { $lte: new Date(req.query.endDate) },
      });
    }
    if (dateConditions.length) {
      matchFilters.$and = dateConditions;
    }

    // Base aggregation pipeline
    const pipeline = [
      { $match: matchFilters },
      {
        $lookup: {
          from: "cars",
          localField: "car",
          foreignField: "_id",
          as: "carDetails",
        },
      },
      { $unwind: { path: "$carDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "car_providers",
          localField: "carDetails.provider_id",
          foreignField: "_id",
          as: "providerDetails",
        },
      },
      { $unwind: { path: "$providerDetails", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          statusPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "pending"] }, then: 1 },
                { case: { $eq: ["$status", "active"] }, then: 2 },
                { case: { $eq: ["$status", "unpaid"] }, then: 3 },
                { case: { $eq: ["$status", "completed"] }, then: 4 },
                { case: { $eq: ["$status", "cancelled"] }, then: 5 },
              ],
              default: 6,
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [
            { $skip: skip },
            { $limit: limit },
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
                createdAt: 1,
                isRated: 1,
                service: 1,
                notes: 1,
                additionalCharges: 1,
                car: {
                  _id: "$carDetails._id",
                  license_plate: "$carDetails.license_plate",
                  brand: "$carDetails.brand",
                  provider_id: "$carDetails.provider_id",
                  provider_name: "$providerDetails.name",
                  model: "$carDetails.model",
                  type: "$carDetails.type",
                  color: "$carDetails.color",
                  available: "$carDetails.available",
                  dailyRate: "$carDetails.dailyRate",
                  tier: "$carDetails.tier",
                  images: "$carDetails.images",
                },
                user: {
                  _id: "$userDetails._id",
                  name: "$userDetails.name",
                  email: "$userDetails.email",
                  telephone_number: "$userDetails.telephone_number",
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          data: "$data",
          totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] },
          count: { $size: "$data" },
        },
      },
    ];

    const results = await Rent.aggregate(pipeline);

    // Prepare pagination info
    const totalCount = results[0]?.totalCount || 0;
    const count = results[0]?.count || 0;
    const pagination = {};

    if (skip + count < totalCount) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (skip > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count,
      totalCount,
      pagination,
      data: results[0]?.data || [],
    });
  } catch (err) {
    console.error(`Error fetching rentals: ${err.message}`);
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message: "Server error while fetching rentals",
    });
  }
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
// @desc    Add rent with optional deposit payment
// @route   POST /api/v1/rents
// @access  Private
exports.addRent = asyncHandler(async (req, res, next) => {
  try {
    // Allow admins to rent for others, otherwise, force req.user.id
    if (req.user.role === "admin" && req.body.user) {
      req.body.user = req.body.user; // Admin specifies user
    } else {
      req.body.user = req.user.id; // Regular users can only rent for themselves
    }

    // Fetch the user renting the car
    const user = await User.findById(req.body.user);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if the user already has 3 active/pending rentals (Admins can bypass this)
    const existingRents = await Rent.find({
      user: req.body.user,
      status: { $in: ["active", "pending", "unpaid"] },
    });

    if (existingRents.length >= 3 && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: `User with ID ${req.body.user} already has 3 active rentals`,
      });
    }

    const {
      car: carId,
      startDate,
      returnDate,
      pickupTime, // Added pickupTime parameter
      returnTime, // Added returnTime parameter
      price,
      service,
      discountAmount,
      payDeposit = false, // Optional parameter to specify if deposit should be paid
    } = req.body;

    if (!carId || !startDate || !returnDate || !price) {
      return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        message: `User's tier (${user.tier}) is too low to rent this car (Tier ${car.tier})`,
      });
    }

    // Combine date and time using dayjs functions
    const start = combineDateTime(startDate, pickupTime);
    const end = combineDateTime(returnDate, returnTime);

    const duration = calculateRentalDuration(start, end);
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

    // Use provided discountAmount or calculate it
    const finalDiscountAmount = tierCalculateDiscount(
      user.tier,
      price,
      servicePrice,
      discountAmount
    );
    // Calculate final price
    const finalPrice = price + servicePrice - finalDiscountAmount;

    // Set values for the rent - convert dayjs objects to ISO strings for storage
    req.body.price = price;
    req.body.servicePrice = servicePrice;
    req.body.discountAmount = finalDiscountAmount;
    req.body.finalPrice = finalPrice;
    req.body.startDate = start.toISOString();
    req.body.returnDate = end.toISOString();
    req.body.pickupTime = pickupTime;
    req.body.returnTime = returnTime;

    // Handle deposit payment if requested
    let depositAmount = 0;
    let creditTransaction = null;

    if (payDeposit) {
      // Calculate 10% deposit amount and round to 2 decimal places
      depositAmount = Math.round(finalPrice * 0.1 * 100) / 100;

      // Check if user has enough credits for deposit
      if (user.credits === undefined || user.credits < depositAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient credits. You need ${depositAmount} credits to pay the deposit for this reservation.`,
        });
      }

      // Create the rental record first to get the rental ID
      const rent = await Rent.create(req.body);

      // Use the credits controller's useCredits function
      const creditsController = require("../controllers/credits");

      // Create a mock request for the useCredits function
      const creditReq = {
        user: { id: user._id },
        body: {
          amount: depositAmount,
          description: `10% deposit for rental #${rent._id} - ${car.brand} ${car.model}`,
          reference: `rental_deposit_${rent._id}`,
        },
      };

      // Create a mock response that captures the result
      let creditResult = null;
      const creditRes = {
        status: (code) => ({
          json: (data) => {
            creditResult = { status: code, ...data };
            return creditRes;
          },
        }),
      };

      // Call useCredits from the credits controller
      await creditsController.useCredits(creditReq, creditRes, (err) => {
        if (err) throw err;
      });

      // Check if credit deduction was successful
      if (!creditResult || !creditResult.success) {
        // If credit deduction failed, delete the rental and return error
        await Rent.findByIdAndDelete(rent._id);
        return res.status(creditResult?.status || 400).json({
          success: false,
          message: creditResult?.message || "Failed to process deposit payment",
        });
      }

      // Update the rental with deposit information
      rent.depositAmount = depositAmount;
      rent.depositTransaction = creditResult.data.transaction._id;
      await rent.save();

      // Return the rental with deposit information
      res.status(201).json({
        success: true,
        totalPrice: finalPrice,
        depositAmount: depositAmount,
        remainingCredits: creditResult.data.credits,
        transaction: creditResult.data.transaction,
        data: rent,
      });
    } else {
      // No deposit payment - create rental normally
      const rent = await Rent.create(req.body);

      res.status(201).json({
        success: true,
        totalPrice: finalPrice,
        data: rent,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});
// @desc Update rent
// @route PUT /api/v1/rents/:id
// @access Private
exports.updateRent = asyncHandler(async (req, res, next) => {
  try {
    let rent = await Rent.findById(req.params.id).populate({
      path: "car",
      select: "provider_id dailyRate tier",
    });
    
    if (!rent) {
      return res.status(404).json({
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
    
    // Log what we're receiving
    console.log("Received update data:", req.body);
    
    // Create update data object
    const updateData = { ...req.body };
    
    // Handle date and time integration for startDate
    // We don't store pickupTime in the schema, but we use it to modify startDate
    if (req.body.startDate && req.body.pickupTime) {
      const startDateObj = new Date(req.body.startDate);
      const [pickupHours, pickupMinutes] = req.body.pickupTime.split(':').map(Number);
      
      // Validate hours and minutes
      if (!isNaN(pickupHours) && !isNaN(pickupMinutes)) {
        startDateObj.setUTCHours(pickupHours, pickupMinutes, 0, 0);
        updateData.startDate = startDateObj.toISOString();
      }
      
      // Remove pickupTime from updateData as it's not in the schema
      delete updateData.pickupTime;
    }
    
    // Handle date and time integration for returnDate
    // We don't store returnTime in the schema, but we use it to modify returnDate
    if (req.body.returnDate && req.body.returnTime) {
      const returnDateObj = new Date(req.body.returnDate);
      const [returnHours, returnMinutes] = req.body.returnTime.split(':').map(Number);
      
      // Validate hours and minutes
      if (!isNaN(returnHours) && !isNaN(returnMinutes)) {
        returnDateObj.setUTCHours(returnHours, returnMinutes, 0, 0);
        updateData.returnDate = returnDateObj.toISOString();
      }
      
      // Remove returnTime from updateData as it's not in the schema
      delete updateData.returnTime;
    }
    
    console.log("Processed update data:", {
      startDate: updateData.startDate,
      returnDate: updateData.returnDate
    });
    
    // Check if we need to recalculate prices and deposit
    // Only recalculate if price changed or we have date changes that would affect duration
    let priceUpdate = null;
    let depositUpdate = null;
    
    // Determine if we need to recalculate (price changed directly or dates changed)
    const priceChanged = updateData.price !== undefined;
    const datesChanged = (updateData.startDate !== undefined || updateData.returnDate !== undefined);
    
    if (priceChanged || datesChanged) {
      // Calculate new price if not provided directly
      let newPrice = updateData.price;
      if (!newPrice && datesChanged) {
        // If dates changed but price not provided, we need to recalculate
        const start = updateData.startDate ? new Date(updateData.startDate) : new Date(rent.startDate);
        const end = updateData.returnDate ? new Date(updateData.returnDate) : new Date(rent.returnDate);
        
        // Get car details if not already populated
        const car = typeof rent.car === "object" ? rent.car : await Car.findById(rent.car);
        if (!car) {
          return res.status(404).json({
            success: false,
            message: "Car details not found",
          });
        }
        
        // Calculate duration in days
        const duration = calculateRentalDuration(start, end);
        if (duration <= 0) {
          return res.status(400).json({
            success: false,
            message: "End date must be after start date",
          });
        }
        
        // Calculate new price based on car daily rate and duration
        newPrice = car.dailyRate * duration;
      }
      
      // If still no new price, use existing rent price
      if (!newPrice) {
        newPrice = rent.price;
      }
      
      // Calculate service price - carry over from existing or recalculate if needed
      let newServicePrice = updateData.servicePrice !== undefined ? updateData.servicePrice : rent.servicePrice || 0;
      
      // Calculate discount amount - carry over from existing or recalculate if needed
      let newDiscountAmount = updateData.discountAmount !== undefined ? updateData.discountAmount : rent.discountAmount || 0;
      
      // Calculate final price
      const newFinalPrice = newPrice + newServicePrice - newDiscountAmount;
      
      // Handle deposit calculations and credit adjustments
      // Calculate deposit (10% of final price)
      const currentDepositAmount = rent.additionalCharges?.deposit || 0;
      const newDepositAmount = Math.round(newFinalPrice * 0.1 * 100) / 100;
      
      // Calculate deposit difference
      const depositDifference = newDepositAmount - currentDepositAmount;
      
      if (depositDifference !== 0) {
        // Fetch the user for credit operations
        const user = await User.findById(rent.user);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
        
        // Import credits controller
        const creditsController = require("../controllers/credits");
        
        // Handle credit adjustments
        if (depositDifference > 0) {
          // Need to charge additional deposit
          const creditReq = {
            user: { id: user._id },
            body: {
              amount: depositDifference,
              description: `Additional deposit for updated rental #${rent._id}`,
              reference: `rental_deposit_update_${rent._id}`,
            },
          };
          
          // Mock response
          let creditResult = null;
          const creditRes = {
            status: (code) => ({
              json: (data) => {
                creditResult = { status: code, ...data };
                return creditRes;
              },
            }),
          };
          
          // Deduct additional deposit from user credits
          await creditsController.useCredits(creditReq, creditRes, (err) => {
            if (err) throw err;
          });
          
          // Check if credit deduction was successful
          if (!creditResult || !creditResult.success) {
            return res.status(creditResult?.status || 400).json({
              success: false,
              message: creditResult?.message || "Failed to process additional deposit payment",
            });
          }
          
          // Store transaction info in additionalCharges
          if (!updateData.additionalCharges) {
            updateData.additionalCharges = rent.additionalCharges || {};
          }
          updateData.additionalCharges.deposit = newDepositAmount;
          updateData.additionalCharges.lastDepositTransaction = creditResult.data.transaction._id;
          
          depositUpdate = {
            depositAmount: newDepositAmount,
            lastDepositTransaction: creditResult.data.transaction._id,
            depositTransactionDifference: depositDifference
          };
          
        } else if (depositDifference < 0) {
          // Need to refund some deposit (booking cost decreased)
          const creditReq = {
            user: { id: user._id },
            body: {
              amount: Math.abs(depositDifference),
              description: `Refund for deposit difference on rental #${rent._id}`,
              reference: `rental_deposit_refund_${rent._id}`,
            },
          };
          
          // Mock response
          let creditResult = null;
          const creditRes = {
            status: (code) => ({
              json: (data) => {
                creditResult = { status: code, ...data };
                return creditRes;
              },
            }),
          };
          
          // Add refunded deposit to user credits
          await creditsController.addCredits(creditReq, creditRes, (err) => {
            if (err) throw err;
          });
          
          // Check if credit addition was successful
          if (!creditResult || !creditResult.success) {
            return res.status(creditResult?.status || 400).json({
              success: false,
              message: creditResult?.message || "Failed to process deposit refund",
            });
          }
          
          // Store transaction info in additionalCharges
          if (!updateData.additionalCharges) {
            updateData.additionalCharges = rent.additionalCharges || {};
          }
          updateData.additionalCharges.deposit = newDepositAmount;
          updateData.additionalCharges.lastDepositTransaction = creditResult.data.transaction._id;
          
          depositUpdate = {
            depositAmount: newDepositAmount,
            lastDepositTransaction: creditResult.data.transaction._id,
            depositTransactionDifference: depositDifference
          };
        }
      }
      
      // Update price fields if they've changed
      if (newPrice !== rent.price) updateData.price = newPrice;
      if (newServicePrice !== rent.servicePrice) updateData.servicePrice = newServicePrice;
      if (newDiscountAmount !== rent.discountAmount) updateData.discountAmount = newDiscountAmount;
      if (newFinalPrice !== rent.finalPrice) updateData.finalPrice = newFinalPrice;
      
      priceUpdate = {
        newPrice,
        newServicePrice,
        newDiscountAmount,
        newFinalPrice
      };
    }
    
    // Update the rent with new data
    rent = await Rent.findByIdAndUpdate(req.params.id, updateData, {
      new: true
    });
    
    if (!rent) {
      return res.status(500).json({
        success: false,
        message: `Failed to update rent with id ${req.params.id}`
      });
    }
    
    // Check the updated values
    console.log("Updated rent:", {
      startDate: rent.startDate,
      returnDate: rent.returnDate,
      price: rent.price,
      finalPrice: rent.finalPrice
    });
    
    // Prepare response
    const response = {
      success: true,
      data: rent,
    };
    
    if (priceUpdate) {
      response.priceUpdate = {
        price: priceUpdate.newPrice,
        servicePrice: priceUpdate.newServicePrice,
        discountAmount: priceUpdate.newDiscountAmount,
        finalPrice: priceUpdate.newFinalPrice
      };
    }
    
    if (depositUpdate) {
      response.depositUpdate = {
        newDepositAmount: depositUpdate.depositAmount,
        depositDifference: depositUpdate.depositTransactionDifference,
        transaction: depositUpdate.lastDepositTransaction
      };
    }
    
    // Send the updated rent back to the client
    res.status(200).json(response);
  } catch (error) {
    console.error("Error in updateRent:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

// @desc    Delete rent
// @route   DELETE /api/v1/rents/:id
// @access  Private
exports.deleteRent = asyncHandler(async (req, res, next) => {
  const rent = await Rent.findById(req.params.id);

  if (!rent) {
    return res.status(404).json({
      success: false,
      message: `No rent with the id of ${req.params.id}`,
    });
  }

  if (rent.user.toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(401).json({
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
    path: "car",
    select: "tier", // Ensure the tier field is included
  });

  if (!rent) {
    return res.status(404).json({
      success: false,
      message: `No rent with the id of ${req.params.id}`,
    });
  }

  // Check authorization:
  // 1. User can complete their own rental
  // 2. Admin can complete any rental
  // 3. Provider can complete rentals for their cars
  let isAuthorized = false;

  if (req.user) {
    if (req.user.role === "admin") {
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
      message: "Not authorized to complete this rental",
    });
  }

  // Check if rental is already in a final state
  if (
    rent.status === "completed" ||
    rent.status === "cancelled" ||
    rent.status === "unpaid"
  ) {
    return res.status(400).json({
      success: false,
      message: `Rent has already been ${rent.status}`,
    });
  }

  const today = new Date();
  const actualReturnDate = today.toISOString();
  const returnDate = new Date(rent.returnDate);

  let user = await User.findById(rent.user);
  if (user) {
    // Include the finalPrice in the total spend calculation
    const totalSpend =
      rent.finalPrice ||
      rent.price + (rent.servicePrice || 0) - (rent.discountAmount || 0);
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
  const baseRentalCost =
    rent.price + (rent.servicePrice || 0) - (rent.discountAmount || 0);
  const finalPriceWithLateFees = baseRentalCost + lateFee;

  // Update the rent with completion details
  // Changed status to "unpaid" instead of "completed"
  let updateData = {
    status: "unpaid", // Changed from 'completed' to 'unpaid'
    actualReturnDate: new Date(),
    ...req.body,
  };

  // Add late fees if applicable
  if (lateFee > 0) {
    updateData.additionalCharges = {
      ...(rent.additionalCharges || {}),
      lateFee: lateFee,
    };
    updateData.finalPrice = finalPriceWithLateFees;
  }

  rent = await Rent.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  // Detect provider car equal with 10
  const providerProfile = await Car_Provider.findByIdAndUpdate(
    carInfo.provider_id,
    { $inc: { completeRent: 1 } },
    { new: true }
  );

  if (providerProfile.completeRent == 10) {
    await Car_Provider.findByIdAndUpdate(
      carInfo.provider_id,
      { $set: { verified: true } },
      { new: true }
    );
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
    message: "Rental marked as unpaid successfully", // Added a message to indicate new status
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
  if (!validateRateProvider(rating)) {
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
      message: `No rent with the id of ${req.params.id}`,
    });
  }

  // Check authorization
  let isAuthorized = false;

  if (req.user && req.user.role === "admin") {
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
      message: "Not authorized to mark this rental as paid",
    });
  }

  // Only unpaid rentals can be marked as completed
  if (rent.status !== "unpaid") {
    return res.status(400).json({
      success: false,
      message: `Only unpaid rentals can be marked as paid. Current status: ${rent.status}`,
    });
  }

  // Set status to completed
  rent = await Rent.findByIdAndUpdate(
    req.params.id,
    {
      status: "completed",
      ...req.body, // Allow additional fields to be updated (like payment reference, etc.)
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: rent,
    message: "Rental marked as paid and completed successfully",
  });
});
