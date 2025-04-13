const QRCode = require('qrcode');
const logs = require('../utility/logs');

/**
 * 
 * @param {Stream.PassThrough} passThrough Input stream to write the QR code (Need to use `const stream = require('stream');`)
 * @param {String} data Value that you want to encode into QR Code
 * @description This function generates a QR code and writes it to the provided passThrough stream.
 * The QR code is generated in PNG format.
 * @returns FileStream but don't need to use it!
 */
exports.generateQR = async (passThrough, data) => {
    try {
        return QRCode.toFileStream(passThrough, data, {type: 'png' })
    } catch (error) {
        logs.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
}