const express = require('express');
const router = express.Router();
const { uploadImage, deleteImage, uploadMultipleImages } = require('../controllers/image');

const path = require('path');
const multer = require('multer');
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { 
        fileSize: 1024 * 1024 * 5
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

router.route('/')
    .post(upload.single('photo'), uploadImage)
    .delete(deleteImage);

router.route('/multiple')
    .post(upload.array('photos', 5), uploadMultipleImages)

module.exports = router;