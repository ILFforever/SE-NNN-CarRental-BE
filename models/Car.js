const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
    license_plate: {
        type: String,
        required: [true, 'Please add a license plate'],
        unique: true,
        trim: true,
        maxlength: [20, 'License plate can not be more than 20 characters']
    },
    brand: {
        type: String,
        required: [true, 'Please add a brand'],
        trim: true
    },
    provider_id :{
        type: mongoose.Schema.ObjectId,
        required : true
    },
    model: {
        type: String,
        required: [true, 'Please add a model'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Please add a car type'],
        enum: ['sedan', 'suv', 'hatchback', 'convertible', 'truck', 'van', 'other']
    },
    color: {
        type: String,
        required: [true, 'Please add a color']
    },
    manufactureDate: {
        type: Date,
        required: [true, 'Please add manufacture date']
    },
    available: {
        type: Boolean,
        default: true
    },
    dailyRate: {
        type: Number,
        required: [true, 'Please add daily rental rate']
    },
    tier:{
        type: Number,
        required: [true,'Please add a car tier']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
},
{
        toJSON : {virtuals : true},
        toObject : {virtuals:true}
});

// Create Car slug from the brand and model
CarSchema.pre('save', function(next) {
    this.slug = `${this.brand.toLowerCase()}-${this.model.toLowerCase()}-${this.license_plate.toLowerCase().replace(/\s+/g, '-')}`;
    next();
});

CarSchema.virtual('rents',{
    ref: 'Rent',
    localField: '_id',
    foreignField: 'car',
    justOne : false 
});

module.exports = mongoose.model('Car', CarSchema);