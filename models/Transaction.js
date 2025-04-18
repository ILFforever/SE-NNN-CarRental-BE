const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'payment', 'refund'],
        required: true
    },
    transactionDate: {
        type: Date,
        default: Date.now
    },
    reference: {
        type: String,
        default: null
    },
    // For payment/refund transactions related to rentals
    rental: {
        type: mongoose.Schema.ObjectId,
        ref: 'Rent',
        default: null
    },
    // Admin who performed the transaction (for admin actions)
    performedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    },
    // Status of transaction
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'reversed'],
        default: 'completed'
    },
    // For more detailed filtering and reporting
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

// Indexes for faster queries
TransactionSchema.index({ user: 1, transactionDate: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ rental: 1 });
TransactionSchema.index({ transactionDate: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);