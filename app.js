const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require('cors');
const s3Client = require('./config/r2');
const path = require('path');

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

// Set view engine
app.set('view engine', 'ejs');
// Set the views directory
app.set('views', path.join(__dirname, 'pages'));

// Import route files
const cars = require('./routes/cars');
const rents = require('./routes/rents');
const auth = require('./routes/auth');
const provide = require('./routes/Car_Provider');
const services = require('./routes/services');
const qrcode = require('./routes/qrCode');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount routers
app.use('/api/v1/cars', cars);
app.use('/api/v1/rents', rents);
app.use('/api/v1/Car_Provider', provide);
app.use('/api/v1/auth', auth);
app.use('/api/v1/services', services);
app.use('/api/v1/qrcode', qrcode);
app.use('/api/v1/credits', require('./routes/credits'));
app.get('/', (req, res) => {
  res.send("Car Rental API is working!");
})

module.exports = app;