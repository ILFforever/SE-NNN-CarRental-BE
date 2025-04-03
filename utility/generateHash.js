const uuid = require('uuid');
const path = require('path');

exports.generateFileHash = (file) => {
    // Generate a unique hash for the file
    const hash = uuid.v4().substring(0, 8);
    // Generate a timestamp
    const timestamp = Date.now().toString();

    // Combine the hash and timestamp
    const combined = `${hash}-${timestamp}${path.extname(file.originalname)}`;
    return combined;
}