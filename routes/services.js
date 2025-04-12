const express = require('express');

const { 
    getServices,
    getServicesByCarId,
    createService,
    updateService,
} = require('../controllers/service');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
    .route('/')
    .get(protect, authorize('admin', 'provider', 'user') , getServices)
    .post(protect, authorize('admin'), createService);

router
    .route('/:id')
    .put(protect, authorize('admin'), updateService)

router
    .route('/:carId')
    .get(protect, getServicesByCarId);

module.exports = router;