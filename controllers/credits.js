const User = require('../models/User');
const Car_Provider = require('../models/Car_Provider'); // Add Car_Provider model
const Rent = require('../models/Rent');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const { generateQRHash } = require('../utility/generateHash');
const { redis } = require('../config/redis');

/**
 * Helper function to get the authenticated entity (user or provider)
 * @param {Object} req - Request object
 * @returns {Object} Object containing id and type
 */
const getAuthEntity = (req) => {
    if (req.user) {
        return { 
            id: req.user.id, 
            type: 'user',
            model: User
        };
    } else if (req.provider) {
        return { 
            id: req.provider.id, 
            type: 'provider',
            model: Car_Provider
        };
    }
    throw new Error('No authenticated entity found');
};

/**
 * Validate amount parameter and round to 2 decimal places
 * @param {number|string} amount - Amount to validate
 * @returns {number} - Validated and rounded amount
 */
const validateAndRoundAmount = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please provide a valid positive amount');
    }
    // Round to 2 decimal places to avoid floating point precision issues
    return Math.round(numAmount * 100) / 100;
};

/**
 * Validate entity exists
 * @param {string} id - Entity ID to validate
 * @param {Object} model - Mongoose model to query
 * @returns {Promise<Object>} - Entity object if found, throws error if not found
 */
const validateAndGetEntity = async (id, model) => {
    const entity = await model.findById(id);
    if (!entity) {
        throw new Error(`Entity not found with ID: ${id}`);
    }
    return entity;
};

// @desc Generate QR code for topup
// @route POST /api/v1/credits/topup
// @access Private
exports.topupQrCode = asyncHandler(async (req, res) => {
  const { uid, amount } = req.body;
  if (!uid || !amount) {
    return res
      .status(400)
      .json({ success: false, message: "Missing uid" });
  }else if (!amount) {
    if (typeof amount === "number" && amount < 100) 
        return res.status(400).json({
            success: false,
            message: "Minimum to top-up amount is 100"
        });
    return res
      .status(400)
      .json({ success: false, message: "Missing cash amount" });
  }

  try {
    // Check that's uid is valid
    const userValid = await User.findById(uid);
    if (!userValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid uid" });
    }

    const hash = generateQRHash(uid, amount);

    await redis.set(
      hash,
      JSON.stringify({ uid, amount, status: "pending" }),
      "EX",
      60 * 5
    );
    
    return res.status(200).json({
      success: true,
      message: "QR code generated successfully",
      transaction_id: hash,
      url: "https://droplet.ngixx.in.th/api/v1/qrcode/" + hash,
    })
  } catch (error) {
    console.error("Error generating QR code:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate QR code" });
  }
});

// @desc Receive payment from QR code
// @route GET /api/v1/credits/topup/retrieve?trans_id=hash
// @access Private
exports.receiveQrCode = asyncHandler(async (req, res) => {
  const { trans_id } = req.query;
  if (!trans_id) {
    return res.status(400).render("pages/status", {
      locals: {
        uid: uid,
        amount: amount,
        status: "error",
      },
    });
  }

  // Lookup on redis
  const hashData = await redis.get(trans_id);
  if (hashData === null) {
    return res.status(404).render("status", {
      locals: {
        status: "expired",
      },
    });
  }
  const { uid, amount, status } = JSON.parse(hashData);
  if (status !== "pending") {
    return res.status(400).render("status", {
      locals: {
        uid: uid,
        amount: amount,
        status: "already processed",
        showDetails: true,
        transactionDetails: {
          uid: uid,
          amount: amount,
        },
      },
    });
  } else {
    try {
        // Start a transaction session
        let session = await mongoose.startSession();
        session.startTransaction();
        const entity = await User.findById(uid).session(session);
        if (!entity) {
            throw new Error(`User not found with ID: ${uid}`);
        }

        // Initialize credits if needed
        if (entity.credits === undefined) {
            entity.credits = 0;
        }

        // Update credits
        const updatedEntity = await User.findByIdAndUpdate(
            uid,
            { $inc: { credits: amount } },
            { new: true, runValidators: true, session }
        );

        // Create a new transaction record
        const transactionData = {
            amount: amount,
            description: "Credit deposit",
            type: "deposit",
            reference: "QRCode",
            status: 'completed'
        };

        // Set the entity field dynamically
        transactionData.user = uid;
        await Transaction.create(
            [transactionData],
            { session }
        );

        // Commit transaction
        await session.commitTransaction();
        session.endSession();
        res.status(200).render("status", {
            locals: {
                status: "success",
                showDetails: true,
                transactionDetails: {
                    uid: uid,
                    amount: amount,
                },
            },
        });
    } catch (error) {
        console.error(error)
        return res.status(404).render("status", {
            locals: {
                status: "error",
                message: error.message
            }
        })
    }
    await redis.set(
      trans_id,
      JSON.stringify({ uid, amount, status: "completed" }),
      "EX",
      60 * 5
    );

    res.status(200).render("status", {
      locals: {
        status: "success",
        showDetails: true,
        transactionDetails: {
          uid: uid,
          amount: amount,
        },
      },
    });
  }
});

// @desc    Get current status of transaction
// @route   GET /api/v1/credits/topup/status?trans_id=hash
// @access  Private
exports.getQrCodeStatus = asyncHandler(async (req, res) => {
    const { trans_id } = req.query;
    if (!trans_id) {
        return res.status(400).json({
            success: false,
            message: 'Transaction ID is required'
        })
    }
    // Lookup on redis
    const hashData = await redis.get(trans_id);
    if (hashData === null) {
        return res.status(404).json({
            success: false,
            message: 'Transaction not found or expired'
        });
    }
    const topupDetails = JSON.parse(hashData);
    return res.status(200).json(topupDetails);
});

// @desc    Get entity's current credit balance (WITHOUT transaction history)
// @route   GET /api/v1/credits
// @access  Private
exports.getCredits = asyncHandler(async (req, res) => {
    try {
        const auth = getAuthEntity(req);
        
        // Get the authenticated entity
        const entity = await validateAndGetEntity(auth.id, auth.model);
        
        // Return only the credit balance, not the transaction history
        res.status(200).json({
            success: true,
            data: {
                credits: entity.credits || 0 // Default to 0 if credits field doesn't exist
            }
        });
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Add credits to entity account
// @route   POST /api/v1/credits/add
// @access  Private
exports.addCredits = asyncHandler(async (req, res) => {
    let session = null;
    
    try {
        const { amount, description, reference } = req.body;
        const auth = getAuthEntity(req);
        
        // Validate required fields
        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Amount is required'
            });
        }
        
        // Validate amount format and round to 2 decimal places
        const roundedAmount = validateAndRoundAmount(amount);
        
        // Start a transaction session
        session = await mongoose.startSession();
        session.startTransaction();
        
        // Update entity's credits
        // Check if credits field exists first and add it if it doesn't
        const entity = await auth.model.findById(auth.id).session(session);
        
        if (!entity) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: `${auth.type.charAt(0).toUpperCase() + auth.type.slice(1)} not found`
            });
        }
        
        // Initialize credits field if it doesn't exist (particularly for providers)
        if (entity.credits === undefined) {
            entity.credits = 0;
        }
        
        // Update credits
        const updatedEntity = await auth.model.findByIdAndUpdate(
            auth.id,
            { $inc: { credits: roundedAmount } },
            { new: true, runValidators: true, session }
        );
        
        // Create a new transaction record
        // Use dynamic field setting for entity type
        const transactionData = {
            amount: roundedAmount,
            description: description || 'Credit deposit',
            type: 'deposit',
            reference: reference || null,
            status: 'completed'
        };
        
        // Set the entity field dynamically based on entity type
        transactionData[auth.type] = auth.id;
        
        const transaction = await Transaction.create(
            [transactionData],
            { session }
        );
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                credits: updatedEntity.credits,
                transaction: transaction[0]
            },
            message: `${roundedAmount} credits added successfully`
        });
    } catch (error) {
        // Abort transaction on error
        if (session) {
            await session.abortTransaction();
        }
        
        res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        if (session) {
            session.endSession();
        }
    }
});

// @desc    Use credits for payment
// @route   POST /api/v1/credits/use
// @access  Private
exports.useCredits = asyncHandler(async (req, res) => {
    let session = null;
    
    try {
        const { amount, description, reference } = req.body;
        const auth = getAuthEntity(req);
        
        // Validate required fields
        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Amount is required'
            });
        }
        
        // Validate amount format and round to 2 decimal places
        const roundedAmount = validateAndRoundAmount(amount);
        
        // Start a transaction session
        session = await mongoose.startSession();
        session.startTransaction();
        
        // Check if entity has enough credits
        const entity = await auth.model.findById(auth.id).session(session);
        
        if (!entity) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: `${auth.type.charAt(0).toUpperCase() + auth.type.slice(1)} not found`
            });
        }
        
        // Initialize credits if needed
        if (entity.credits === undefined) {
            entity.credits = 0;
        }
        
        if (entity.credits < roundedAmount) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Insufficient credits'
            });
        }
        
        // Update entity's credits
        const updatedEntity = await auth.model.findByIdAndUpdate(
            auth.id,
            { $inc: { credits: -roundedAmount } },
            { new: true, runValidators: true, session }
        );
        
        // Create a new transaction record
        const transactionData = {
            amount: -roundedAmount,
            description: description || 'Credit payment',
            type: 'payment',
            reference: reference || null,
            status: 'completed'
        };
        
        // Set the entity field dynamically
        transactionData[auth.type] = auth.id;
        
        const transaction = await Transaction.create(
            [transactionData],
            { session }
        );
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                credits: updatedEntity.credits,
                transaction: transaction[0]
            },
            message: `${roundedAmount} credits used successfully`
        });
    } catch (error) {
        // Abort transaction on error
        if (session) {
            await session.abortTransaction();
        }
        
        res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        if (session) {
            session.endSession();
        }
    }
});

// @desc    Refund credits to entity account
// @route   POST /api/v1/credits/refund
// @access  Private (Admin only)
exports.refundCredits = asyncHandler(async (req, res) => {
    let session = null;
    
    try {
        const { userId, providerId, amount, description, reference } = req.body;
        
        // Validate required fields
        if ((!userId && !providerId) || !amount) {
            return res.status(400).json({
                success: false,
                message: 'User ID or Provider ID, and amount are required'
            });
        }
        
        if (userId && providerId) {
            return res.status(400).json({
                success: false,
                message: 'Provide either userId OR providerId, not both'
            });
        }
        
        // Determine target entity type and ID
        const entityType = userId ? 'user' : 'provider';
        const entityId = userId || providerId;
        const EntityModel = entityType === 'user' ? User : Car_Provider;
        
        // Validate amount format and round to 2 decimal places
        const roundedAmount = validateAndRoundAmount(amount);
        
        // Start a transaction session
        session = await mongoose.startSession();
        session.startTransaction();
        
        // Update entity's credits
        const entity = await EntityModel.findById(entityId).session(session);
        
        if (!entity) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`
            });
        }
        
        // Initialize credits if needed
        if (entity.credits === undefined) {
            entity.credits = 0;
        }
        
        const updatedEntity = await EntityModel.findByIdAndUpdate(
            entityId,
            { $inc: { credits: roundedAmount } },
            { new: true, runValidators: true, session }
        );
        
        // Create a new transaction record
        const transactionData = {
            amount: roundedAmount,
            description: description || 'Credit refund',
            type: 'refund',
            reference: reference || null,
            performedBy: req.user.id, // Admin who performed the refund
            status: 'completed'
        };
        
        // Set entity field dynamically
        transactionData[entityType] = entityId;
        
        const transaction = await Transaction.create(
            [transactionData],
            { session }
        );
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                entityId: updatedEntity._id,
                entityType,
                credits: updatedEntity.credits,
                transaction: transaction[0]
            },
            message: `${roundedAmount} credits refunded successfully to ${entityType} ${updatedEntity.name}`
        });
    } catch (error) {
        // Abort transaction on error
        if (session) {
            await session.abortTransaction();
        }
        
        res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        if (session) {
            session.endSession();
        }
    }
});

// @desc    Admin endpoint to manage entity credits
// @route   POST /api/v1/credits/admin/manage
// @access  Private (Admin only)
exports.adminManageCredits = asyncHandler(async (req, res) => {
    let session = null;
    
    try {
        const { userId, providerId, action, amount, description, reference } = req.body;
        
        // Validate required fields
        if ((!userId && !providerId) || !action || !amount) {
            return res.status(400).json({
                success: false,
                message: 'User ID or Provider ID, action, and amount are required'
            });
        }
        
        if (userId && providerId) {
            return res.status(400).json({
                success: false,
                message: 'Provide either userId OR providerId, not both'
            });
        }
        
        if (!['add', 'use', 'refund'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Valid action (add, use, refund) is required'
            });
        }
        
        // Determine target entity type and ID
        const entityType = userId ? 'user' : 'provider';
        const entityId = userId || providerId;
        const EntityModel = entityType === 'user' ? User : Car_Provider;
        
        // Validate amount format and round to 2 decimal places
        const roundedAmount = validateAndRoundAmount(amount);
        
        // Start a transaction session
        session = await mongoose.startSession();
        session.startTransaction();
        
        // Check entity exists
        const entity = await EntityModel.findById(entityId).session(session);
        
        if (!entity) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`
            });
        }
        
        // Initialize credits if needed
        if (entity.credits === undefined) {
            entity.credits = 0;
            await entity.save({ session });
        }
        
        let updatedEntity;
        let transactionType;
        let transactionAmount;
        
        switch (action) {
            case 'add':
                updatedEntity = await EntityModel.findByIdAndUpdate(
                    entityId,
                    { $inc: { credits: roundedAmount } },
                    { new: true, runValidators: true, session }
                );
                transactionType = 'deposit';
                transactionAmount = roundedAmount;
                break;
                
            case 'use':
                // Check if entity has enough credits
                if (entity.credits < roundedAmount) {
                    await session.abortTransaction();
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient credits'
                    });
                }
                
                updatedEntity = await EntityModel.findByIdAndUpdate(
                    entityId,
                    { $inc: { credits: -roundedAmount } },
                    { new: true, runValidators: true, session }
                );
                transactionType = 'withdrawal';
                transactionAmount = -roundedAmount;
                break;
                
            case 'refund':
                updatedEntity = await EntityModel.findByIdAndUpdate(
                    entityId,
                    { $inc: { credits: roundedAmount } },
                    { new: true, runValidators: true, session }
                );
                transactionType = 'refund';
                transactionAmount = roundedAmount;
                break;
        }
        
        // Create a new transaction record
        const transactionData = {
            amount: transactionAmount,
            description: description || `Admin ${action}`,
            type: transactionType,
            reference: reference || null,
            performedBy: req.user.id, // Admin who performed the action
            status: 'completed',
            metadata: { 
                adminAction: action,
                adminNote: req.body.adminNote || null
            }
        };
        
        // Set entity field dynamically
        transactionData[entityType] = entityId;
        
        const transaction = await Transaction.create(
            [transactionData],
            { session }
        );
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                entityId: updatedEntity._id,
                entityType,
                credits: updatedEntity.credits,
                transaction: transaction[0]
            },
            message: `${roundedAmount} credits ${action === 'add' ? 'added to' : action === 'use' ? 'deducted from' : 'refunded to'} ${entityType} ${updatedEntity.name}`
        });
    } catch (error) {
        // Abort transaction on error
        if (session) {
            await session.abortTransaction();
        }
        
        res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        if (session) {
            session.endSession();
        }
    }
});

// @desc    Pay for rental using credits
// @route   POST /api/v1/credits/pay-rental/:rentalId
// @access  Private
exports.payRentalWithCredits = asyncHandler(async (req, res) => {
    let session = null;
    
    try {
        const { rentalId } = req.params;
        const auth = getAuthEntity(req);
        
        // Validate rental ID
        if (!rentalId || !mongoose.Types.ObjectId.isValid(rentalId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid rental ID is required'
            });
        }
        
        // Start a transaction session
        session = await mongoose.startSession();
        session.startTransaction();
        
        // Find the rental
        const rental = await Rent.findById(rentalId).session(session);
        
        if (!rental) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Rental not found'
            });
        }
        
        // Check authorization based on entity type
        if (auth.type === 'user') {
            // Check if the rental belongs to the current user
            if (rental.user.toString() !== auth.id) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to pay for this rental'
                });
            }
        } else if (auth.type === 'provider') {
            // For providers, check if they own the car in the rental
            const car = await Car.findById(rental.car).session(session);
            
            if (!car || car.provider_id.toString() !== auth.id) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to pay for this rental'
                });
            }
        }
        
        // Check if the rental is in 'unpaid' status
        if (rental.status !== 'unpaid') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `This rental cannot be paid (current status: ${rental.status})`
            });
        }
        
        // Calculate the amount to be paid and round to 2 decimal places
        let amountToPay = rental.finalPrice || 
                          (rental.price + (rental.servicePrice || 0) - 
                           (rental.discountAmount || 0) + 
                           (rental.additionalCharges ? rental.additionalCharges.lateFee || 0 : 0));
        
        // Round to 2 decimal places to avoid floating point precision issues
        amountToPay = Math.round(amountToPay * 100) / 100;
        
        // Check if entity has enough credits
        const entity = await auth.model.findById(auth.id).session(session);
        
        if (!entity) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: `${auth.type.charAt(0).toUpperCase() + auth.type.slice(1)} not found`
            });
        }
        
        // Initialize credits if needed
        if (entity.credits === undefined) {
            entity.credits = 0;
            await entity.save({ session });
        }
        
        if (entity.credits < amountToPay) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Insufficient credits. You need ${amountToPay} credits to pay for this rental.`
            });
        }
        
        // Update entity's credits
        const updatedEntity = await auth.model.findByIdAndUpdate(
            auth.id,
            { $inc: { credits: -amountToPay } },
            { new: true, runValidators: true, session }
        );
        
        // Create a new transaction record
        const transactionData = {
            amount: -amountToPay,
            description: `Payment for rental #${rental._id}`,
            type: 'payment',
            reference: rental._id.toString(),
            rental: rental._id, // Direct reference to the rental
            status: 'completed',
            metadata: {
                rentalDetails: {
                    startDate: rental.startDate,
                    returnDate: rental.returnDate,
                    finalPrice: amountToPay
                }
            }
        };
        
        // Set entity field dynamically
        transactionData[auth.type] = auth.id;
        
        const transaction = await Transaction.create(
            [transactionData],
            { session }
        );
        
        // Update rental status to 'completed'
        rental.status = 'completed';
        await rental.save({ session });
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                rentalId: rental._id,
                amount: amountToPay,
                remainingCredits: updatedEntity.credits,
                rentalStatus: rental.status,
                transaction: transaction[0]
            },
            message: `Rental paid successfully with ${amountToPay} credits`
        });
        
    } catch (error) {
        // Abort transaction on error
        if (session) {
            await session.abortTransaction();
        }
        
        res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        if (session) {
            session.endSession();
        }
    }
});

// @desc    Get all transactions (admin only)
// @route   GET /api/v1/credits/transactions
// @access  Private (Admin only)
exports.getAllTransactions = asyncHandler(async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        
        // Build query with filters
        let query = {};
        
        // Filter by entity
        if (req.query.userId) {
            query.user = req.query.userId;
        }
        
        if (req.query.providerId) {
            query.provider = req.query.providerId;
        }
        
        // Filter by type
        if (req.query.type) {
            if (Array.isArray(req.query.type)) {
                query.type = { $in: req.query.type };
            } else {
                query.type = req.query.type;
            }
        }
        
        // Filter by status
        if (req.query.status) {
            if (Array.isArray(req.query.status)) {
                query.status = { $in: req.query.status };
            } else {
                query.status = req.query.status;
            }
        }
        
        // Filter by date range
        if (req.query.startDate || req.query.endDate) {
            query.transactionDate = {};
            
            if (req.query.startDate) {
                query.transactionDate.$gte = new Date(req.query.startDate);
            }
            
            if (req.query.endDate) {
                // Add one day to include the end date fully
                const endDate = new Date(req.query.endDate);
                endDate.setDate(endDate.getDate() + 1);
                query.transactionDate.$lt = endDate;
            }
        }
        
        // Filter by reference (e.g., rental ID)
        if (req.query.reference) {
            query.reference = req.query.reference;
        }

        // Filter by rental ID
        if (req.query.rentalId) {
            query.rental = req.query.rentalId;
        }

        // Search in description
        if (req.query.search) {
            query.description = { $regex: req.query.search, $options: 'i' };
        }
        
        // Count total documents matching the query
        const total = await Transaction.countDocuments(query);
        
        // Prepare sorting (newest first by default)
        let sort = { transactionDate: -1 };
        
        // Allow custom sorting if specified
        if (req.query.sort) {
            sort = {};
            const sortParams = req.query.sort.split(',');
            
            sortParams.forEach(param => {
                if (param.startsWith('-')) {
                    sort[param.substring(1)] = -1;
                } else {
                    sort[param] = 1;
                }
            });
        }
        
        // Execute query with pagination and joins
        const transactions = await Transaction.find(query)
            .populate({
                path: 'rental',
                select: 'startDate returnDate status finalPrice car',
                populate: {
                    path: 'car',
                    select: 'brand model license_plate'
                }
            })
            .sort(sort)
            .skip(startIndex)
            .limit(limit);
        
        // Calculate pagination info
        const pagination = {};
        
        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }
        
        if (startIndex + limit < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }
        
        // Get entity's current credit balance
        const entity = await auth.model.findById(auth.id);
        
        // Calculate summary statistics
        const deposits = await Transaction.aggregate([
            { $match: { ...query, type: 'deposit' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        
        const payments = await Transaction.aggregate([
            { $match: { ...query, type: 'payment' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        
        const refunds = await Transaction.aggregate([
            { $match: { ...query, type: 'refund' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        
        const withdrawals = await Transaction.aggregate([
            { $match: { ...query, type: 'withdrawal' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        
        const summary = {
            deposits: {
                count: deposits.length > 0 ? deposits[0].count : 0,
                total: deposits.length > 0 ? deposits[0].total : 0
            },
            payments: {
                count: payments.length > 0 ? payments[0].count : 0,
                total: payments.length > 0 ? Math.abs(payments[0].total) : 0
            },
            refunds: {
                count: refunds.length > 0 ? refunds[0].count : 0,
                total: refunds.length > 0 ? refunds[0].total : 0
            },
            withdrawals: {
                count: withdrawals.length > 0 ? withdrawals[0].count : 0,
                total: withdrawals.length > 0 ? Math.abs(withdrawals[0].total) : 0
            }
        };
        
        // Add net flow (credits in - credits out)
        summary.netFlow = (summary.deposits.total + summary.refunds.total) - 
                        (summary.payments.total + summary.withdrawals.total);
        
        res.status(200).json({
            success: true,
            count: transactions.length,
            total,
            pagination,
            summary,
            data: {
                currentCredits: entity ? (entity.credits || 0) : 0,
                transactions
            }
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get transaction details
// @route   GET /api/v1/credits/transactions/:id
// @access  Private (Admin only)
exports.getTransactionById = asyncHandler(async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('user', 'name email telephone_number')
            .populate('provider', 'name email telephone_number')
            .populate('performedBy', 'name email role')
            .populate({
                path: 'rental',
                populate: {
                    path: 'car',
                    select: 'brand model license_plate'
                }
            });
            
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

 //Get entity's transaction history
 // @route   GET /api/v1/credits/history
 // @access  Private
 exports.getUserTransactionHistory = asyncHandler(async (req, res) => {
    try {
        const auth = getAuthEntity(req);
        
        // Get pagination parameters if provided, or use defaults
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const startIndex = (page - 1) * limit;
        
        // Build query with filters
        let query = {};
        query[auth.type] = auth.id; // Set entity field dynamically
        
        // Filter by type
        if (req.query.type) {
            if (Array.isArray(req.query.type)) {
                query.type = { $in: req.query.type };
            } else {
                query.type = req.query.type;
            }
        }
        
        // Filter by status
        if (req.query.status) {
            if (Array.isArray(req.query.status)) {
                query.status = { $in: req.query.status };
            } else {
                query.status = req.query.status;
            }
        }
        
        // Filter by date range
        if (req.query.startDate || req.query.endDate) {
            query.transactionDate = {};
            
            if (req.query.startDate) {
                query.transactionDate.$gte = new Date(req.query.startDate);
            }
            
            if (req.query.endDate) {
                // Add one day to include the end date fully
                const endDate = new Date(req.query.endDate);
                endDate.setDate(endDate.getDate() + 1);
                query.transactionDate.$lt = endDate;
            }
        }
        
        // Filter by reference (e.g., rental ID)
        if (req.query.reference) {
            query.reference = req.query.reference;
        }

        // Filter by rental ID
        if (req.query.rentalId) {
            query.rental = req.query.rentalId;
        }

        // Search in description
        if (req.query.search) {
            query.description = { $regex: req.query.search, $options: 'i' };
        }
        
        // Count total documents matching the query
        const total = await Transaction.countDocuments(query);
        
        // Prepare sorting (newest first by default)
        let sort = { transactionDate: -1 };
        
        // Allow custom sorting if specified
        if (req.query.sort) {
            sort = {};
            const sortParams = req.query.sort.split(',');
            
            sortParams.forEach(param => {
                if (param.startsWith('-')) {
                    sort[param.substring(1)] = -1;
                } else {
                    sort[param] = 1;
                }
            });
        }
        
        // Execute query with pagination and joins - ADD strictPopulate: false
        const transactions = await Transaction.find(query)
            .populate({
                path: 'rental',
                select: 'startDate returnDate status finalPrice car',
                strictPopulate: false,
                populate: {
                    path: 'car',
                    select: 'brand model license_plate',
                    strictPopulate: false
                }
            })
            .sort(sort)
            .skip(startIndex)
            .limit(limit);
        
        // Calculate pagination info
        const pagination = {};
        
        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }
        
        if (startIndex + limit < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }
        
        // Get entity's current credit balance
        const entity = await auth.model.findById(auth.id);
        
        // Calculate summary statistics
        const deposits = await Transaction.aggregate([
            { $match: { ...query, type: 'deposit' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        
        const payments = await Transaction.aggregate([
            { $match: { ...query, type: 'payment' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        
        const refunds = await Transaction.aggregate([
            { $match: { ...query, type: 'refund' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        
        const withdrawals = await Transaction.aggregate([
            { $match: { ...query, type: 'withdrawal' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        
        const summary = {
            deposits: {
                count: deposits.length > 0 ? deposits[0].count : 0,
                total: deposits.length > 0 ? deposits[0].total : 0
            },
            payments: {
                count: payments.length > 0 ? payments[0].count : 0,
                total: payments.length > 0 ? Math.abs(payments[0].total) : 0
            },
            refunds: {
                count: refunds.length > 0 ? refunds[0].count : 0,
                total: refunds.length > 0 ? refunds[0].total : 0
            },
            withdrawals: {
                count: withdrawals.length > 0 ? withdrawals[0].count : 0,
                total: withdrawals.length > 0 ? Math.abs(withdrawals[0].total) : 0
            }
        };
        
        // Add net flow (credits in - credits out)
        summary.netFlow = (summary.deposits.total + summary.refunds.total) - 
                        (summary.payments.total + summary.withdrawals.total);
        
        res.status(200).json({
            success: true,
            count: transactions.length,
            total,
            pagination,
            summary,
            data: {
                currentCredits: entity ? (entity.credits || 0) : 0,
                transactions
            }
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});