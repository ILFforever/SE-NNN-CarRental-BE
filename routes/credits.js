// Updated routes/credits.js
const express = require('express');
const router = express.Router();
const { 
    getCredits, 
    addCredits, 
    useCredits, 
    refundCredits, 
    adminManageCredits,
    payRentalWithCredits,
    getAllTransactions,
    getTransactionById,
    getUserTransactionHistory,
    topupQrCode,
    receiveQrCode,
    getQrCodeStatus,
} = require('../controllers/credits');

const { protect, authorize } = require('../middleware/auth');

// Topup Endpoints (There are public endpoints)
router.get('/topup/retrieve', receiveQrCode);
router.get('/topup/status', getQrCodeStatus);

// Apply protection to all routes
router.use(protect);

// User credit endpoints
router.get('/', getCredits);
router.get('/history', getUserTransactionHistory);
router.post('/add', addCredits);
router.post('/use', useCredits);
router.post('/pay-rental/:rentalId', payRentalWithCredits);

// Topup Endpoints
router.post('/topup', topupQrCode);

// Admin-only endpoints
router.post('/refund', authorize('admin'), refundCredits);
router.post('/admin/manage', authorize('admin'), adminManageCredits);

// Transaction management routes (admin only)
router.get('/transactions', authorize('admin'), getAllTransactions);
router.get('/transactions/:id', authorize('admin'), getTransactionById);

module.exports = router;