// controllers/credits.js
const User = require('../models/User');
const Rent = require('../models/Rent');
const mongoose = require('mongoose');

// Decimal128 type can be used for precise monetary values if needed
// const { Decimal128 } = mongoose.Types;
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

// @desc    Get user's current credit balance and history
// @route   GET /api/v1/credits
// @access  Private
exports.getCredits = asyncHandler(async (req, res) => {
    try {
        const user = await validateAndGetUser(req.user.id);
        
        res.status(200).json({
            success: true,
            data: {
                credits: user.credits,
                history: user.creditsHistory || []
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
        
        // Use atomic operation to update credits
        const result = await User.findOneAndUpdate(
            { _id: req.user.id },
            { 
                $inc: { credits: roundedAmount },
                $push: { 
                    creditsHistory: {
                        amount: roundedAmount,
                        description: description || 'Credit deposit',
                        type: 'deposit',
                        reference: reference || null,
                        transactionDate: new Date()
                    }
                }
            },
            { 
                new: true, 
                runValidators: true,
                session
            }
        );
        
        if (!result) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                credits: result.credits,
                transaction: result.creditsHistory[result.creditsHistory.length - 1]
            },
            message: `${amount} credits added successfully`
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
        
        // Use atomic operation to check balance and update in one operation
        const result = await User.findOneAndUpdate(
            { 
                _id: req.user.id,
                credits: { $gte: roundedAmount } // Check sufficient balance
            },
            { 
                $inc: { credits: -roundedAmount },
                $push: { 
                    creditsHistory: {
                        amount: -roundedAmount,
                        description: description || 'Credit payment',
                        type: 'payment',
                        reference: reference || null,
                        transactionDate: new Date()
                    }
                }
            },
            { 
                new: true, 
                runValidators: true,
                session
            }
        );
        
        if (!result) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Insufficient credits or user not found'
            });
        }
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                credits: result.credits,
                transaction: result.creditsHistory[result.creditsHistory.length - 1]
            },
            message: `${amount} credits used successfully`
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
        
        // Validate amount format
        validateAmount(amount);
        
        // Start a transaction session
        session = await mongoose.startSession();
        session.startTransaction();
        
        // Use atomic operation to update credits
        const result = await User.findOneAndUpdate(
            { _id: userId },
            { 
                $inc: { credits: parseFloat(amount) },
                $push: { 
                    creditsHistory: {
                        amount: parseFloat(amount),
                        description: description || 'Credit refund',
                        type: 'refund',
                        reference: reference || null,
                        transactionDate: new Date()
                    }
                }
            },
            { 
                new: true, 
                runValidators: true,
                session
            }
        );
        
        if (!result) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                userId: result._id,
                credits: result.credits,
                transaction: result.creditsHistory[result.creditsHistory.length - 1]
            },
            message: `${amount} credits refunded successfully to user ${result.name}`
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
        
        let result;
        
        switch (action) {
            case 'add':
                result = await User.findOneAndUpdate(
                    { _id: userId },
                    { 
                        $inc: { credits: roundedAmount },
                        $push: { 
                            creditsHistory: {
                                amount: roundedAmount,
                                description: description || 'Admin deposit',
                                type: 'deposit',
                                reference: reference || null,
                                transactionDate: new Date()
                            }
                        }
                    },
                    { 
                        new: true, 
                        runValidators: true,
                        session
                    }
                );
                break;
                
            case 'use':
                result = await User.findOneAndUpdate(
                    { 
                        _id: userId,
                        credits: { $gte: roundedAmount } // Check sufficient balance
                    },
                    { 
                        $inc: { credits: -roundedAmount },
                        $push: { 
                            creditsHistory: {
                                amount: -roundedAmount,
                                description: description || 'Admin deduction',
                                type: 'payment',
                                reference: reference || null,
                                transactionDate: new Date()
                            }
                        }
                    },
                    { 
                        new: true, 
                        runValidators: true,
                        session
                    }
                );
                break;
                
            case 'refund':
                result = await User.findOneAndUpdate(
                    { _id: userId },
                    { 
                        $inc: { credits: roundedAmount },
                        $push: { 
                            creditsHistory: {
                                amount: roundedAmount,
                                description: description || 'Admin refund',
                                type: 'refund',
                                reference: reference || null,
                                transactionDate: new Date()
                            }
                        }
                    },
                    { 
                        new: true, 
                        runValidators: true,
                        session
                    }
                );
                break;
        }
        
        if (!result) {
            await session.abortTransaction();
            return res.status(action === 'use' ? 400 : 404).json({
                success: false,
                message: action === 'use' ? 'Insufficient credits or user not found' : 'User not found'
            });
        }
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: {
                userId: result._id,
                credits: result.credits,
                transaction: result.creditsHistory[result.creditsHistory.length - 1]
            },
            message: `${amount} credits ${action === 'add' ? 'added to' : action === 'use' ? 'deducted from' : 'refunded to'} user ${result.name}`
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
        
        // Use atomic operation to check balance and update in one operation
        const user = await User.findOneAndUpdate(
            { 
                _id: req.user.id,
                credits: { $gte: amountToPay } // Check sufficient balance
            },
            { 
                $inc: { credits: -amountToPay },
                $push: { 
                    creditsHistory: {
                        amount: -amountToPay,
                        description: `Payment for rental #${rental._id}`,
                        type: 'payment',
                        reference: rental._id.toString(),
                        transactionDate: new Date()
                    }
                }
            },
            { 
                new: true, 
                runValidators: true,
                session
            }
        );
        
        if (!user) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Insufficient credits. You need ${amountToPay} credits to pay for this rental.`
            });
        }
        
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
                remainingCredits: user.credits,
                rentalStatus: rental.status
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