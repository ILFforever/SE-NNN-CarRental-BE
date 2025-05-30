const express = require('express');
const { 
    getCars,
    getCar,
    createCar,
    updateCar,
    deleteCar,
    updateCarImageOrder, 
    checkCarAvailability,
    toggleCarAvailability,
    getMostPopularCars 
} = require('../controllers/cars');

// Include rent router for nested routes
const rentRouter = require('./rents');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Image Storage
const path = require('path');
const multer = require('multer');
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { 
        fileSize: 1024 * 1024 * 15
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('File upload only supports JPEG, JPG, PNG, and GIF formats.'));
    }
});

// Re-route into other resource routers
router.use('/:carId/rents', rentRouter);

// Public route for most popular cars
router.get('/popular', getMostPopularCars);

// Regular car routes with authentication
router
    .route('/')
    .get(getCars)
    .post(protect, authorize('admin', 'provider'), upload.array('images', 5), createCar);

router
    .route('/:id')
    .get(getCar)
    .put(protect, authorize('admin', 'provider'), upload.array('images', 5), updateCar)
    .delete(protect, authorize('admin', 'provider'), deleteCar);

router
    .route('/check-availability/:carId')
    .get(protect, checkCarAvailability);

// Route for updating image order
router
    .route('/:id/image-order')
    .put(protect, authorize('admin', 'provider'), updateCarImageOrder);

router
    .route('/:id/availability')
    .patch(protect, authorize('admin', 'provider'), toggleCarAvailability);

module.exports = router;