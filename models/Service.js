const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'name'],
        unique: true,
    },
    available: {
        type: Boolean,
        default: true
    },
    rate: {
        type: Number,
        required: [true, 'Please add service rate']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('service', ServiceSchema);