const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    //add telephone number
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
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    total_spend:{
        type: Number ,
        default: 0   
    },
    tier:{
        type:Number,
        default: 0
    }
});

//Encrypt password using bcrypt
UserSchema.pre('save', function (next) {
    this.total_spend = this.total_spend || 0;  // Ensure total_spend is not undefined
    this.tier = Math.floor(this.total_spend / 10000);
    next();
});


//Sign JWT and return 
UserSchema.methods.getSignedJwtToken=function(){
    return jwt.sign({id:this._id},process.env.JWT_SECRET,{
        expiresIn:process.env.JWT_EXPIRE});
}

UserSchema.pre('save', async function(next) {
    // Only hash the password if it's been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    this.total_spend = this.total_spend || 0;
    this.tier = Math.floor(this.total_spend / 10000);
    
    next();
});

//match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
}

module.exports = mongoose.model('User', UserSchema);