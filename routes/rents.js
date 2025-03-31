const express = require('express');
const { 
    getUserRents,
    getAllRents, 
    getRent, 
    addRent,
    updateRent, 
    deleteRent, 
    completeRent,
    confirmRent
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

// Individual rent routes
router
    .route('/:id')
    .get(getRent)
    .put(updateRent)
    .delete(deleteRent);

// Complete a rent (return car)
router
    .route('/:id/complete')
    .put(completeRent);

// Admin confirmation route
router
    .route('/:id/confirm')
    .put(authorize('admin'), confirmRent);

module.exports = router;