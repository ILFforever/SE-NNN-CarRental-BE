const User = require('../models/User');
const Rent = require('../models/Rent');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

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
 * Validate user exists
 * @param {string} userId - User ID to validate
 * @returns {Promise<Object>} - User object if found, throws error if not found
 */
const validateAndGetUser = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

// @desc    Get user's current credit balance and transaction history
// @route   GET /api/v1/credits
// @access  Private
exports.getCredits = asyncHandler(async (req, res) => {
    try {
        const user = await validateAndGetUser(req.user.id);
        
        // Get the user's transaction history from the Transaction model
        const transactions = await Transaction.find({ user: req.user.id })
            .sort({ transactionDate: -1 })
            .limit(50); // Get up to 50 most recent transactions
        
        res.status(200).json({
            success: true,
            data: {
                credits: user.credits,
                transactions
            }
        });
    } catch (error) {
        res.status(error.message === 'User not found' ? 404 : 500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Add credits to user account
// @route   POST /api/v1/credits/add
// @access  Private
exports.addCredits = asyncHandler(async (req, res) => {
    let session = null;
    
    try {
        const { amount, description, reference } = req.body;
        
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
        
        // Update user's credits
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $inc: { credits: roundedAmount } },
            { new: true, runValidators: true, session }
        );
        
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Create a new transaction record
        const transaction = await Transaction.create(
            [{
                user: req.user.id,
                amount: roundedAmount,
                description: description || 'Credit deposit',
                type: 'deposit',
                reference: reference || null,
                status: 'completed'
            }],
            { session }
        );
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                credits: user.credits,
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
        
        // Check if user has enough credits
        const user = await User.findById(req.user.id).session(session);
        
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (user.credits < roundedAmount) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Insufficient credits'
            });
        }
        
        // Update user's credits
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $inc: { credits: -roundedAmount } },
            { new: true, runValidators: true, session }
        );
        
        // Create a new transaction record
        const transaction = await Transaction.create(
            [{
                user: req.user.id,
                amount: -roundedAmount,
                description: description || 'Credit payment',
                type: 'payment',
                reference: reference || null,
                status: 'completed'
            }],
            { session }
        );
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                credits: updatedUser.credits,
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

// @desc    Refund credits to user account
// @route   POST /api/v1/credits/refund
// @access  Private (Admin only)
exports.refundCredits = asyncHandler(async (req, res) => {
    let session = null;
    
    try {
        const { userId, amount, description, reference } = req.body;
        
        // Validate required fields
        if (!userId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'User ID and amount are required'
            });
        }
        
        // Validate amount format and round to 2 decimal places
        const roundedAmount = validateAndRoundAmount(amount);
        
        // Start a transaction session
        session = await mongoose.startSession();
        session.startTransaction();
        
        // Update user's credits
        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { credits: roundedAmount } },
            { new: true, runValidators: true, session }
        );
        
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Create a new transaction record
        const transaction = await Transaction.create(
            [{
                user: userId,
                amount: roundedAmount,
                description: description || 'Credit refund',
                type: 'refund',
                reference: reference || null,
                performedBy: req.user.id, // Admin who performed the refund
                status: 'completed'
            }],
            { session }
        );
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                userId: user._id,
                credits: user.credits,
                transaction: transaction[0]
            },
            message: `${roundedAmount} credits refunded successfully to user ${user.name}`
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

// @desc    Admin endpoint to manage user credits
// @route   POST /api/v1/credits/admin/manage
// @access  Private (Admin only)
exports.adminManageCredits = asyncHandler(async (req, res) => {
    let session = null;
    
    try {
        const { userId, action, amount, description, reference } = req.body;
        
        // Validate required fields
        if (!userId || !action || !amount) {
            return res.status(400).json({
                success: false,
                message: 'User ID, action, and amount are required'
            });
        }
        
        if (!['add', 'use', 'refund'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Valid action (add, use, refund) is required'
            });
        }
        
        // Validate amount format and round to 2 decimal places
        const roundedAmount = validateAndRoundAmount(amount);
        
        // Start a transaction session
        session = await mongoose.startSession();
        session.startTransaction();
        
        // Check user exists
        const user = await User.findById(userId).session(session);
        
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        let updatedUser;
        let transactionType;
        let transactionAmount;
        
        switch (action) {
            case 'add':
                updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { credits: roundedAmount } },
                    { new: true, runValidators: true, session }
                );
                transactionType = 'deposit';
                transactionAmount = roundedAmount;
                break;
                
            case 'use':
                // Check if user has enough credits
                if (user.credits < roundedAmount) {
                    await session.abortTransaction();
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient credits'
                    });
                }
                
                updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { credits: -roundedAmount } },
                    { new: true, runValidators: true, session }
                );
                transactionType = 'withdrawal';
                transactionAmount = -roundedAmount;
                break;
                
            case 'refund':
                updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { credits: roundedAmount } },
                    { new: true, runValidators: true, session }
                );
                transactionType = 'refund';
                transactionAmount = roundedAmount;
                break;
        }
        
        // Create a new transaction record
        const transaction = await Transaction.create(
            [{
                user: userId,
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
            }],
            { session }
        );
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                userId: updatedUser._id,
                credits: updatedUser.credits,
                transaction: transaction[0]
            },
            message: `${roundedAmount} credits ${action === 'add' ? 'added to' : action === 'use' ? 'deducted from' : 'refunded to'} user ${updatedUser.name}`
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
        
        // Check if the rental belongs to the current user
        if (rental.user.toString() !== req.user.id) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to pay for this rental'
            });
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
        
        // Check if user has enough credits
        const user = await User.findById(req.user.id).session(session);
        
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (user.credits < amountToPay) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Insufficient credits. You need ${amountToPay} credits to pay for this rental.`
            });
        }
        
        // Update user's credits
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $inc: { credits: -amountToPay } },
            { new: true, runValidators: true, session }
        );
        
        // Create a new transaction record
        const transaction = await Transaction.create(
            [{
                user: req.user.id,
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
            }],
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
                remainingCredits: updatedUser.credits,
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
        
        // Filter by user
        if (req.query.userId) {
            query.user = req.query.userId;
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
        
        // Filter by minimum amount
        if (req.query.minAmount) {
            query.amount = { $gte: parseFloat(req.query.minAmount) };
        }
        
        // Filter by maximum amount
        if (req.query.maxAmount) {
            if (!query.amount) query.amount = {};
            query.amount.$lte = parseFloat(req.query.maxAmount);
        }
        
        // Filter by rental
        if (req.query.rentalId) {
            query.rental = req.query.rentalId;
        }
        
        // Search by description
        if (req.query.search) {
            query.description = { $regex: req.query.search, $options: 'i' };
        }
        
        // Count total documents
        const total = await Transaction.countDocuments(query);
        
        // Prepare sorting
        let sort = {};
        if (req.query.sort) {
            const sortFields = req.query.sort.split(',');
            
            sortFields.forEach(field => {
                if (field.startsWith('-')) {
                    sort[field.substring(1)] = -1;
                } else {
                    sort[field] = 1;
                }
            });
        } else {
            // Default sorting by transaction date (newest first)
            sort = { transactionDate: -1 };
        }
        
        // Execute query with pagination and population
        const transactions = await Transaction.find(query)
            .populate('user', 'name email')
            .populate('performedBy', 'name email')
            .populate('rental', 'startDate returnDate status')
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
        
        // Calculate summary statistics if requested
        let summary = null;
        if (req.query.summary === 'true') {
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
            
            summary = {
                deposits: {
                    count: deposits[0]?.count || 0,
                    total: deposits[0]?.total || 0
                },
                payments: {
                    count: payments[0]?.count || 0,
                    total: Math.abs(payments[0]?.total || 0)
                },
                refunds: {
                    count: refunds[0]?.count || 0,
                    total: refunds[0]?.total || 0
                },
                withdrawals: {
                    count: withdrawals[0]?.count || 0,
                    total: Math.abs(withdrawals[0]?.total || 0)
                },
                netFlow: (deposits[0]?.total || 0) + 
                         (refunds[0]?.total || 0) + 
                         (payments[0]?.total || 0) + 
                         (withdrawals[0]?.total || 0)
            };
        }
        
        res.status(200).json({
            success: true,
            count: transactions.length,
            total,
            pagination,
            summary,
            data: transactions
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
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

/**
 * Get user's transaction history
 * @route   GET /api/v1/credits/history
 * @access  Private
 */
const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

exports.getUserTransactionHistory = asyncHandler(async (req, res) => {
    try {
        // Get pagination parameters if provided, or use defaults
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const startIndex = (page - 1) * limit;
        
        // Build query with filters
        let query = { user: req.user.id };
        
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
        
        // Get user's current credit balance
        const user = await User.findById(req.user.id);
        
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
                currentCredits: user ? user.credits : 0,
                transactions
            }
        });
    } catch (error) {
        console.error('Error fetching user transaction history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});