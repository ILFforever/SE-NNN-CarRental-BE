const mongoose = require('mongoose');

const RentSchema = new mongoose.Schema({
    startDate: {
        type: Date,
        required: [true, 'Please add a start date'],
        default: Date.now
    },
    returnDate: {
        type: Date,
        required: [true, 'Please add a return date']
    },
    actualReturnDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled'],
        default: 'pending'
    },
    price: {
        type: Number,
        required: [true, 'Please specify the rental price']
    },
    servicePrice: {
        type: Number,
        default: 0,
        // This field stores the calculated total service price
    },
    discountAmount: {
        type: Number,
        default: 0,
        // This field stores the discount amount based on user tier
    },
    finalPrice: {
        type: Number,
        // This field stores the final price after all calculations
    },
    additionalCharges: {
        type: Object
    },
    notes: {
        type: String
    },
    car: {
        type: mongoose.Schema.ObjectId,
        ref: 'Car',
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    service: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isRated: {
        type: Boolean,
        default: false
    },
});

// Pre-save middleware to calculate finalPrice
RentSchema.pre('save', function(next) {
    // Calculate finalPrice based on price, servicePrice, and discountAmount
    this.finalPrice = (this.price || 0) + (this.servicePrice || 0) - (this.discountAmount || 0);
    next();
});

module.exports = mongoose.model('Rent', RentSchema);