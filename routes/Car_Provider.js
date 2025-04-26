
const express = require("express");
const {
  getCarProviders,
  getCarProvider,
  createCarProvider,
  updateCarProvider,
  deleteCarProvider,
  registerProvider,
  loginProvider,
  getCurrentProvider,
  logoutProvider,
  verifyProvider,
  getProviderDashboard
} = require("../controllers/Car_Provider");

const router = express.Router();
const { protect, authorize } = require("../middleware/auth");

// Public routes
router.post('/register', registerProvider);
router.post('/login', loginProvider);

// Protected routes
router.get('/me', protect, getCurrentProvider);
router.post('/logout', protect, logoutProvider);

// Add dashboard route BEFORE the /:id route
router.get('/dashboard', protect, getProviderDashboard); // Add this line

// Routes that use the root path
router.route('/')
    .get(getCarProviders)
    .post(createCarProvider);

// Routes with ID parameter - these should come AFTER specific named routes
router.route('/:id')
    .get(getCarProvider)
    .put(protect, authorize('provider', 'admin'), updateCarProvider)
    .delete(protect, authorize('admin'), deleteCarProvider);

router.route('/:id/verify')
    .post(protect, authorize('admin'), verifyProvider)

module.exports = router;
