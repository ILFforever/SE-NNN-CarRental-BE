const { r2Client, BUCKET_NAME } = require('../config/r2');
const uuid = require('uuid');
const path = require('path');
const asyncHandler = require('express-async-handler');

exports.uploadImage = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded.',
        });
    }

    const params = {
        Bucket: BUCKET_NAME,
        Key: `images/${uuid.v4()}${path.extname(req.file.originalname)}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
    };

    try {
        await r2Client.putObject(params).promise();
        res.status(200).json({
            succces: true,
            message: 'Image uploaded successfully',
        })
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Image upload failed',
        });
    }
});