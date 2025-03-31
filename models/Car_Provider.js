const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const CarProviderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add car provider name']
    },
    address: {
        type: String,
        required: [true, 'Please add an address'],
    },
    telephone_number: {
        type: String,
        required: [true, 'Please add a telephone number in form of XXX-XXXXXXX'],
        match: [/^\d{3}-\d{7}$/,'Please add a valid telephone number']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Encrypt password using bcrypt
CarProviderSchema.pre('save', async function(next) {
    // Only hash the password if it's been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Sign JWT and return
CarProviderSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, type: 'provider' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Match provider entered password to hashed password in database
CarProviderSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Car_Provider', CarProviderSchema);