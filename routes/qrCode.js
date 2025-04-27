const express = require('express');
const router = express.Router();
const { recieve, getStatus } = require('../controllers/qrCode');

router.get('/recieve', recieve);
router.get('/verify', getStatus);

module.exports = router;