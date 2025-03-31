const express = require('express');
const { 
    getCars,
    getCar,
    createCar,
    updateCar,
    deleteCar
} = require('../controllers/cars');

// Include rent router for nested routes
const rentRouter = require('./rents');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Re-route into other resource routers
router.use('/:carId/rents', rentRouter);

router
    .route('/')
    .get(getCars)
    .post(protect, authorize('admin'), createCar);

router
    .route('/:id')
    .get(getCar)
    .put(protect, authorize('admin'), updateCar)
    .delete(protect, authorize('admin'), deleteCar);

module.exports = router;