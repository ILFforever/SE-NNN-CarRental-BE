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
    description: {
        type: String,
        require: [true, 'Please add description']
    },
    rate: {
        type: Number,
        required: [true, 'Please add service rate']
    },
    daily: {
        type: Boolean,
        required: [true, 'Please select service type']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('service', ServiceSchema);