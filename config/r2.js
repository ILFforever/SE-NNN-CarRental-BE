require('dotenv').config();
const S3 = require('aws-sdk/clients/s3');

// Connect to S3 (Cloudflare R2)
const r2Client = new S3({
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    },
    token: process.env.R2_TOKEN,
    signatureVersion: "v4"
});

console.log("S3 Client Initialized:", r2Client.config);

const BUCKET_NAME = "blob-ngixx";

module.exports = { r2Client, BUCKET_NAME };