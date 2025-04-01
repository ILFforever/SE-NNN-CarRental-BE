// Updated version of routes/rents.js
const express = require('express');
const { 
    getUserRents,
    getAllRents, 
    getRent, 
    addRent,
    updateRent, 
    deleteRent, 
    completeRent,
    confirmRent,
    getProviderRents,
    cancelRent  // Add the new controller function
} = require('../controllers/rents');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

// Apply protection to all routes
router.use(protect);

// Regular user routes - get their own rents
router
    .route('/')
    .get(getUserRents)
    .post(addRent);

// Admin-only route - get all rents
router
    .route('/all')
    .get(authorize('admin'), getAllRents);

// Provider-only route - get rentals for provider's cars
router
    .route('/provider')
    .get(getProviderRents);

// Individual rent routes
router
    .route('/:id')
    .get(getRent)
    .put(updateRent)
    .delete(deleteRent);

// Complete a rent (return car) - now accessible by both admin and provider
router
    .route('/:id/complete')
    .put(completeRent);

// Confirm route - now accessible by both admin and provider
router
    .route('/:id/confirm')
    .put(confirmRent);

// Cancel route - new route for both admin and provider
router
    .route('/:id/cancel')
    .put(cancelRent);

module.exports = router;