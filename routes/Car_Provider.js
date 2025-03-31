const express = require('express');
const { 
    getCarProviders, 
    getCarProvider, 
    createCarProvider, 
    updateCarProvider, 
    deleteCarProvider,
    registerProvider,
    loginProvider,
    getCurrentProvider,
    logoutProvider 
} = require('../controllers/Car_Provider');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/register', registerProvider);
router.post('/login', loginProvider);
router.get('/me', protect, getCurrentProvider);
router.post('/logout', protect, logoutProvider);

// Routes that use the root path
router.route('/')
    .get(getCarProviders)
    .post(createCarProvider);

// Routes with ID parameter
router.route('/:id')
    .get(getCarProvider)
    .put(protect, authorize('admin'), updateCarProvider)
    .delete(protect, authorize('admin'), deleteCarProvider);

module.exports = router;