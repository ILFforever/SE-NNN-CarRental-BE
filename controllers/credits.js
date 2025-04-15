// controllers/credits.js
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Get user's current credit balance and history
// @route   GET /api/v1/credits
// @access  Private
exports.getCredits = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                credits: user.credits,
                history: user.creditsHistory || []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Add credits to user account
// @route   POST /api/v1/credits/add
// @access  Private
exports.addCredits = asyncHandler(async (req, res) => {
    try {
        const { amount, description, reference } = req.body;
        
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid positive amount'
            });
        }
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        await user.addCredits(
            parseFloat(amount),
            description || 'Credit deposit',
            reference || null
        );
        
        res.status(200).json({
            success: true,
            data: {
                credits: user.credits,
                transaction: user.creditsHistory[user.creditsHistory.length - 1]
            },
            message: `${amount} credits added successfully`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Use credits for payment
// @route   POST /api/v1/credits/use
// @access  Private
exports.useCredits = asyncHandler(async (req, res) => {
    try {
        const { amount, description, reference } = req.body;
        
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid positive amount'
            });
        }
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        if (user.credits < parseFloat(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient credits'
            });
        }
        
        await user.useCredits(
            parseFloat(amount),
            description || 'Credit payment',
            reference || null
        );
        
        res.status(200).json({
            success: true,
            data: {
                credits: user.credits,
                transaction: user.creditsHistory[user.creditsHistory.length - 1]
            },
            message: `${amount} credits used successfully`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Refund credits to user account
// @route   POST /api/v1/credits/refund
// @access  Private (Admin only)
exports.refundCredits = asyncHandler(async (req, res) => {
    try {
        const { userId, amount, description, reference } = req.body;
        
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid positive amount'
            });
        }
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        await user.refundCredits(
            parseFloat(amount),
            description || 'Credit refund',
            reference || null
        );
        
        res.status(200).json({
            success: true,
            data: {
                userId: user._id,
                credits: user.credits,
                transaction: user.creditsHistory[user.creditsHistory.length - 1]
            },
            message: `${amount} credits refunded successfully to user ${user.name}`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Admin endpoint to manage user credits
// @route   POST /api/v1/credits/admin/manage
// @access  Private (Admin only)
exports.adminManageCredits = asyncHandler(async (req, res) => {
    try {
        const { userId, action, amount, description, reference } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        if (!action || !['add', 'use', 'refund'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Valid action (add, use, refund) is required'
            });
        }
        
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid positive amount'
            });
        }
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        let result;
        
        switch (action) {
            case 'add':
                result = await user.addCredits(
                    parseFloat(amount),
                    description || 'Admin deposit',
                    reference || null
                );
                break;
            case 'use':
                result = await user.useCredits(
                    parseFloat(amount),
                    description || 'Admin deduction',
                    reference || null
                );
                break;
            case 'refund':
                result = await user.refundCredits(
                    parseFloat(amount),
                    description || 'Admin refund',
                    reference || null
                );
                break;
        }
        
        res.status(200).json({
            success: true,
            data: {
                userId: user._id,
                credits: user.credits,
                transaction: user.creditsHistory[user.creditsHistory.length - 1]
            },
            message: `${amount} credits ${action === 'add' ? 'added to' : action === 'use' ? 'deducted from' : 'refunded to'} user ${user.name}`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Pay for rental using credits
// @route   POST /api/v1/credits/pay-rental/:rentalId
// @access  Private
exports.payRentalWithCredits = asyncHandler(async (req, res) => {
    try {
        const { rentalId } = req.params;
        
        if (!rentalId) {
            return res.status(400).json({
                success: false,
                message: 'Rental ID is required'
            });
        }
        
        // Find the rental
        const Rent = require('../models/Rent');
        const rental = await Rent.findById(rentalId);
        
        if (!rental) {
            return res.status(404).json({
                success: false,
                message: 'Rental not found'
            });
        }
        
        // Check if the rental belongs to the current user
        if (rental.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to pay for this rental'
            });
        }
        
        // Check if the rental is in 'unpaid' status
        if (rental.status !== 'unpaid') {
            return res.status(400).json({
                success: false,
                message: `This rental cannot be paid (current status: ${rental.status})`
            });
        }
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Calculate the amount to be paid
        const amountToPay = rental.finalPrice || 
                          (rental.price + (rental.servicePrice || 0) - 
                           (rental.discountAmount || 0) + 
                           (rental.additionalCharges ? rental.additionalCharges.lateFee || 0 : 0));
        
        // Check if user has enough credits
        if (user.credits < amountToPay) {
            return res.status(400).json({
                success: false,
                message: `Insufficient credits. You have ${user.credits} credits, but need ${amountToPay} credits.`
            });
        }
        
        // Use credits and update rental status
        await user.useCredits(
            amountToPay,
            `Payment for rental #${rental._id}`,
            rental._id.toString()
        );
        
        // Update rental status to 'completed'
        rental.status = 'completed';
        await rental.save();
        
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
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});