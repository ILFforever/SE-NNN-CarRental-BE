const express = require('express');
const router = express.Router();
const { topup, recieve, getStatus } = require('../controllers/qrCode');

router.get('/topup', topup);
router.get('/recieve', recieve);
router.get('/verify', getStatus);

module.exports = router;