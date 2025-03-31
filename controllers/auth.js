const User = require('../models/User');
const { options } = require('../routes/auth');
const ValidToken = require('../models/ValidToken');

// @desc    Register user
// @route   GET /api/v1/auth/register
// @access  Public
exports.register = async(req, res, next) => {
    try{
        const{name,telephone_number,email,password,role}= req.body;

        //Create User
        const user = await User.create({
            name,
            telephone_number,
            email,
            password,
            role
        });
        //create token
        //const token = user.getSignedJwtToken();
        res.status(200).json({ success: true });
        //sendTokenResponse(user,200,res);
    }
    catch(err){
        res.status(400).json({success:false});
        console.log(err.stack);
    }
    
    
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async(req,res,next)=>{
    const {email,password}= req.body;

    //validate email&password
    if(!email || !password){
        return res.status(400).json({success:false,msg:'Please provide an email and password'});
    }

    //check for user
    const user = await User.findOne({email}).select('+password');
    if(!user){
        return res.status(400).json({success:false,msg:'Invalid credentials'});
    }

    //check if password matches
    const isMatch = await user.matchPassword(password);
    if(!isMatch){
        return res.status(401).json({success:false,msg:'Invalid credentials'});
    }

    //create token 
    //const token = user.getSignedJwtToken();
    //res.status(200).json({success:true,token});
    sendTokenResponse(user,200,res);
};

const sendTokenResponse = async (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    // Save the valid token to the database
    await ValidToken.create({ token, expiresAt: options.expires });

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token
    });
}

// @desc    Get current Logged in user
// @route   POST /api/v1/auth/curuser
// @access  Private
exports.getCurrentUser=async(req,res,next)=>{
    const user=await User.findById(req.user.id);
    res.status(200).json({
        success:true,
        data:user
    });
};

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
/*exports.logout = (req,res,next)=>{
    res.clearcookie('token',{
        expires: new Date(Date.now+1000),
        httpOnly:true
    });

    res.status(200).json({
        success: true,
        message: `${req.user.role} logged out successfully`
    });
}*/

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization.split(' ')[1];

    // Remove the token from the list of valid tokens
    await ValidToken.deleteOne({ token });

    res.cookie('token', 'none', {
        expires: new Date(Date.now() - 10 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    });

    res.status(200).json({
        success: true,
        data: {},
        message: 'User logged out successfully'
    });
};

// @desc    Get all admin users
// @route   GET /api/v1/auth/admins
// @access  Private/Admin
exports.getAdmins = async(req, res, next) => {
    try {
        // Find all users with role="admin"
        const adminUsers = await User.find({ role: 'admin' }).select('-password');
        
        res.status(200).json({
            success: true,
            count: adminUsers.length,
            data: adminUsers
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Delete admin user
// @route   DELETE /api/v1/auth/admins/:id
// @access  Private/Admin
exports.deleteAdmin = async(req, res, next) => {
    try {
        // Find the user to ensure it's an admin
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User not found with id ${req.params.id}`
            });
        }
        
        // Check if the user is an admin
        if (user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'User is not an admin'
            });
        }
        
        // Prevent admin from deleting their own account
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Admin cannot delete their own account'
            });
        }
        
        // Delete any tokens associated with this user
        await ValidToken.deleteMany({ token: { $regex: req.params.id } });
        
        // Delete the user
        await User.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            data: {},
            message: 'Admin deleted successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

exports.getUsers = async(req, res, next) => {
    try {
        // Find all users with role="admin"
        const adminUsers = await User.find({ role: 'user' }).select('-password');
        
        res.status(200).json({
            success: true,
            count: adminUsers.length,
            data: adminUsers
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

exports.deleteUser = async(req, res, next) => {
    try {
        // Find the user to ensure it's an admin
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User not found with id ${req.params.id}`
            });
        }
        
        // Check if the user is an admin
        if (user.role !== 'user') {
            return res.status(400).json({
                success: false,
                message: 'User is not an user'
            });
        }
        
        // // Prevent admin from deleting their own account
        // if (user._id.toString() === req.user.id) {
        //     return res.status(400).json({
        //         success: false,
        //         message: 'Admin cannot delete their own account'
        //     });
        // }
        
        // Delete any tokens associated with this user
        await ValidToken.deleteMany({ token: { $regex: req.params.id } });
        
        // Delete the user
        await User.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            data: {},
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};