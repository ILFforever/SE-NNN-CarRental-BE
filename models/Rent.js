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
        //required: [true, 'Please specify the rental price']
    },
    additionalCharges: {
        type: Number,
        default: 0
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});


module.exports = mongoose.model('Rent', RentSchema);