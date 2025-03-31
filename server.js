const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require('cors');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

app.use(cors());

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Import route files
const cars = require('./routes/cars');
const rents = require('./routes/rents');
const auth = require('./routes/auth');
const provide = require('./routes/Car_Provider');

// Mount routers
app.use('/api/v1/cars', cars);
app.use('/api/v1/rents', rents);
app.use('/api/v1/Car_Provider', provide);
app.use('/api/v1/auth', auth);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});