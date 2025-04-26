const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CEDT-RENTALS API',
      version: '1.0.0',
      description: 'Basic api documentation',
    },
  },
  apis: ['./routes/*.js'], // Path to the API routes files
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;