const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() { return this.type !== 'system'; }
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CarProvider',
        required: function() { return this.type === 'system' || this.type === 'payout'; }
    },
    rental: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rent',  // Make sure this matches your Rent model name
        required: false
    },
    type: {
        type: String,
        enum: ['deposit', 'payment', 'withdrawal', 'refund', 'system', 'payout'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'reversed'],
        default: 'completed'
    },
    description: {
        type: String,
        trim: true
    },
    reference: {
        type: String
    },
    transactionDate: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Optional: Add a virtual to populate rental details more dynamically
TransactionSchema.virtual('rentalDetails', {
    ref: 'Rent',
    localField: 'rental',
    foreignField: '_id',
    justOne: true
});

// Optional: Pre-find hook to automatically populate rental if it exists
TransactionSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'rental',
        select: 'startDate returnDate status finalPrice car',
        populate: {
            path: 'car',
            select: 'brand model license_plate'
        }
    });
    next();
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;