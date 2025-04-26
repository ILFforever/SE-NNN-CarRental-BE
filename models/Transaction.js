const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    // User reference - optional, only set for user transactions
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
    },
    // Provider reference - optional, only set for provider transactions
    provider: {
        type: mongoose.Schema.ObjectId,
        ref: 'Car_Provider',
        // Also optional
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

// Custom validation to ensure either user or provider is provided
TransactionSchema.pre('validate', function(next) {
    if (!this.user && !this.provider) {
        this.invalidate('user', 'Either user or provider must be provided');
    }
    next();
});

// Indexes for faster queries
TransactionSchema.index({ user: 1, transactionDate: -1 });
TransactionSchema.index({ provider: 1, transactionDate: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ rental: 1 });
TransactionSchema.index({ transactionDate: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);