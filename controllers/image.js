const { r2Client, BUCKET_NAME } = require('../config/r2');
const asyncHandler = require('express-async-handler');
const logs = require('../utility/logs');
const { generateFileHash } = require('../utility/generateHash');

exports.uploadImage = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded.',
        });
    }
    const uploadFileName = generateFileHash(req.file);

    const params = {
        Bucket: BUCKET_NAME,
        Key: `images/${uploadFileName}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
    };

    try {
        await r2Client.putObject(params).promise();
        res.status(200).json({
            succces: true,
            message: 'Image uploaded successfully',
            filePath: `https://blob.ngixx.me/images/${uploadFileName}`,
        })
    } catch (err) {
        logs.error(err);
        res.status(500).json({
            success: false,
            message: 'Image upload failed',
        });
    }
});

exports.deleteImage = asyncHandler(async (req, res, next) => {
    const { fileName } = req.body;
    if (!fileName) {
        return res.status(400).json({
            success: false,
            message: 'No file name provided.',
        });
    }

    const params = {
        Bucket: BUCKET_NAME,
        Key: `images/${fileName}`,
    }

    try {
        await r2Client.deleteObject(params).promise();
        res.status(200).json({
            success: true,
            message: 'Image deleted successfully',
        });
    } catch (err) {
        logs.error(err);
        res.status(500).json({
            success: false,
            message: 'Image deletion failed',
        });
    }
})