const mongoose = require('mongoose');

const ValidTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
});

module.exports = mongoose.model('ValidToken', ValidTokenSchema);
