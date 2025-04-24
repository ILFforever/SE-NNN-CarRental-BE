// Update routes/rents.js to include the new endpoint

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
    cancelRent,
    rateProvider,
    markAsPaid  // Add the new controller function
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
    .get(getAllRents);

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

// Mark a rent as paid (change from unpaid to completed)
router
    .route('/:id/paid')
    .put(markAsPaid);

// Confirm route - now accessible by both admin and provider
router
    .route('/:id/confirm')
    .put(confirmRent);

// Cancel route - new route for both admin and provider
router
    .route('/:id/cancel')
    .put(cancelRent);

router
    .route('/:id/rate')
    .post(rateProvider);

module.exports = router;