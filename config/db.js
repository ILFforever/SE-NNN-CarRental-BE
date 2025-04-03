const mongoose = require('mongoose');
const logs = require('../utility/logs');

// Connect with MongoDB
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    logs.system(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logs.error(`Error connecting to MongoDB: ${error.message}`);
    // Don't exit the process in a serverless environment, handle gracefully
    throw error;
  }
}

module.exports = connectDB;