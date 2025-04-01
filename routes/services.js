const express = require('express');

const { 
    getServices,
    createService,
    updateService,
} = require('../controllers/service');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
    .route('/')
    .get(protect, authorize('provider', 'admin'),getServices)
    .post(protect, authorize('admin'), createService);

router
    .route('/:id')
    .put(protect, authorize('admin'), updateService)

module.exports = router;