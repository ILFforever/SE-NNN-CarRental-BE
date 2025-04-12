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
    tier: {
        type: Number,
        required: [true,'Please add a car tier']
    },
    service: {
        type: [String],
        default: []
    },
    images: {
        type: [String],
        default: []  
    },
    // New field to maintain image order
    imageOrder: {
        type: [String],
        default: [] // Will store image filenames in order
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

// Pre-save hook to ensure imageOrder matches images array if not set
CarSchema.pre('save', function(next) {
    // If imageOrder is empty but images exist, initialize it with images
    if (this.images.length > 0 && this.imageOrder.length === 0) {
        this.imageOrder = this.images.slice();
    }
    
    // Remove any stale entries from imageOrder that don't exist in images
    this.imageOrder = this.imageOrder.filter(filename => 
        this.images.includes(filename)
    );
    
    next();
});

module.exports = mongoose.model('Car', CarSchema);