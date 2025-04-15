const express = require('express');
const { register, login, getCurrentUser, logout, getAdmins, deleteAdmin, getUsers, deleteUser, addFavoriteCar, removeFavoriteCar, getCreditsHistory} = require('../controllers/auth');

const router = express.Router();

const {protect, authorize} = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/curuser', protect, getCurrentUser);
router.post('/logout', protect, logout);
router.get('/admins', protect, authorize('admin'), getAdmins);
router.get('/users',protect, authorize('admin'), getUsers);

router.post('/favorite', protect,  addFavoriteCar);
router.delete('/favorite',protect,  removeFavoriteCar);

router.delete('/admins/:id', protect, authorize('admin'), deleteAdmin);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

router.get('/credits-history', protect, getCreditsHistory);

module.exports = router;