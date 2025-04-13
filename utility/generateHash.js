const uuid = require("uuid");
const crypto = require("crypto");
const path = require("path");

exports.generateFileHash = (file) => {
  // Generate a unique hash for the file
  const hash = uuid.v4().substring(0, 8);
  // Generate a timestamp
  const timestamp = Date.now().toString();

  // Combine the hash and timestamp
  const combined = `${hash}-${timestamp}${path.extname(file.originalname)}`;
  return combined;
};

exports.generateQRHash = (uid, cash) => {
  const hash = crypto
    .createHash("sha256")
    .update(`${uid}-${cash}`)
    .digest("hex");
  return hash;
};
