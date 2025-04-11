const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require('cors');
const s3Client = require('./config/r2');

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
const services = require('./routes/services');
const images = require('./routes/image');

// Mount routers
app.use('/api/v1/cars', cars);
app.use('/api/v1/rents', rents);
app.use('/api/v1/Car_Provider', provide);
app.use('/api/v1/auth', auth);
app.use('/api/v1/services', services);
app.use('/api/v1/image', images)

app.get('/', (req, res) => {
  res.send("Car Rental API is working!");
})

module.exports = app;