/** 
 * @swagger 
 * components:
 *   schemas:
 *     Car:
 *       type: object
 *       required:
 *         - license_plate
 *         - brand
 *         - model
 *         - type
 *         - color
 *         - manufactureDate
 *         - dailyRate
 *         - tier
 *         - provider_id
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the car
 *         license_plate:
 *           type: string
 *           description: Unique license plate number
 *           maxLength: 20
 *         brand:
 *           type: string
 *           description: Car brand
 *         model:
 *           type: string
 *           description: Car model
 *         type:
 *           type: string
 *           enum: ['sedan', 'suv', 'hatchback', 'convertible', 'truck', 'van', 'other']
 *           description: Type of car
 *         color:
 *           type: string
 *           description: Car color
 *         manufactureDate:
 *           type: string
 *           format: date
 *           description: Manufacturing date of the car
 *         available:
 *           type: boolean
 *           description: Availability status of the car
 *           default: true
 *         dailyRate:
 *           type: number
 *           description: Daily rental rate
 *         tier:
 *           type: number
 *           description: Car tier level
 *         provider_id:
 *           type: string
 *           description: ID of the car provider
 *         service:
 *           type: array
 *           items:
 *             type: string
 *           description: List of service IDs
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: List of image URLs
 *         imageOrder:
 *           type: array
 *           items:
 *             type: string
 *           description: Order of images
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date of car creation
 * 
 * /cars:
 *   get:
 *     summary: Get all cars with optional filtering and pagination
 *     tags: [Cars]
 *     parameters:
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: Comma-separated list of fields to select
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Field to sort by (prefix with - for descending)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Filter cars by provider ID
 *     responses:
 *       200:
 *         description: List of cars
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 totalCount:
 *                   type: number
 *                 totalMatchingCount:
 *                   type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     next:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                     prev:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Car'
 *   post:
 *     summary: Create a new car
 *     tags: [Cars]
 *     security:
 *     - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               license_plate:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ['sedan', 'suv', 'hatchback', 'convertible', 'truck', 'van', 'other']
 *               color:
 *                 type: string
 *               manufactureDate:
 *                 type: string
 *                 format: date
 *               dailyRate:
 *                 type: number
 *               tier:
 *                 type: number
 *               available:
 *                 type: boolean
 *               provider_id:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Car created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Car'
 * 
 * /cars/{id}:
 *   get:
 *     summary: Get a specific car by ID
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Car'
 * 
 *   put:
 *     summary: Update a car
 *     tags: [Cars]
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               license_plate:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ['sedan', 'suv', 'hatchback', 'convertible', 'truck', 'van', 'other']
 *               color:
 *                 type: string
 *               manufactureDate:
 *                 type: string
 *                 format: date
 *               dailyRate:
 *                 type: number
 *               tier:
 *                 type: number
 *               available:
 *                 type: boolean
 *               removeImage:
 *                 type: array
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Car updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Car'
 * 
 *   delete:
 *     summary: Delete a car
 *     tags: [Cars]
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 * 
 * /cars/check-availability/{carId}:
 *   get:
 *     summary: Check car availability for specific dates
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: returnDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *       - in: query
 *         name: returnTime
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: boolean
 *                     conflicts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                           returnDate:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 * 
 * /cars/{id}/availability:
 *   patch:
 *     summary: Toggle car availability
 *     tags: [Cars]
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Car availability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Car'
 *                 message:
 *                   type: string
 * 
 * /cars/popular:
 *   get:
 *     summary: Get most popular cars
 *     tags: [Cars]
 *     responses:
 *       200:
 *         description: List of most popular cars
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Car'
 */