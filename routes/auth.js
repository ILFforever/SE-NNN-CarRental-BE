// Update to routes/auth.js to add the update-profile endpoint

const express = require('express');
const { 
    register, 
    login, 
    getCurrentUser, 
    logout, 
    getAdmins, 
    deleteAdmin, 
    getUsers, 
    deleteUser, 
    addFavoriteCar, 
    removeFavoriteCar,
    updateUserProfile  // Add the new controller function
} = require('../controllers/auth');

const router = express.Router();

const {protect, authorize} = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/curuser', protect, getCurrentUser);
router.post('/logout', protect, logout);
router.get('/admins', protect, authorize('admin'), getAdmins);
router.get('/users', protect, authorize('admin'), getUsers);

router.post('/favorite', protect, addFavoriteCar);
router.delete('/favorite', protect, removeFavoriteCar);

// Add the new update profile route
router.put('/update-profile', protect, updateUserProfile);

router.delete('/admins/:id', protect, authorize('admin'), deleteAdmin);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;