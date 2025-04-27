/**
 * @swagger
 * components:
 *   schemas:
 *     CarProvider:
 *       type: object
 *       required:
 *         - name
 *         - address
 *         - telephone_number
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the car provider
 *         name:
 *           type: string
 *           description: Car provider name
 *         address:
 *           type: string
 *           description: Car provider address
 *         telephone_number:
 *           type: string
 *           pattern: '^\d{3}-\d{7}$'
 *           description: Telephone number in format XXX-XXXXXXX
 *         email:
 *           type: string
 *           format: email
 *           description: Car provider email address
 *         password:
 *           type: string
 *           format: password
 *           description: Car provider password (minimum 6 characters)
 *         verified:
 *           type: boolean
 *           description: Verification status of car provider
 *         completeRent:
 *           type: number
 *           description: Number of completed rentals
 *         credits:
 *           type: number
 *           description: Car provider credits balance
 *         review:
 *           type: object
 *           properties:
 *             totalReviews:
 *               type: number
 *             averageRating:
 *               type: number
 *             ratingDistribution:
 *               type: object
 *               additionalProperties:
 *                 type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /Car_Provider:
 *   get:
 *     summary: Get all car providers
 *     tags: [Car Providers]
 *     responses:
 *       200:
 *         description: List of all car providers
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
 *                     $ref: '#/components/schemas/CarProvider'
 */

/**
 * @swagger
 * /Car_Provider:
 *   post:
 *     summary: Create a new car provider
 *     tags: [Car Providers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CarProvider'
 *     responses:
 *       201:
 *         description: Car provider created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CarProvider'
 */

/**
 * @swagger
 * /Car_Provider/{id}:
 *   get:
 *     summary: Get single car provider
 *     tags: [Car Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Car provider ID
 *     responses:
 *       200:
 *         description: Car provider details with associated cars
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/CarProvider'
 *                     - type: object
 *                       properties:
 *                         cars:
 *                           type: array
 *                           items:
 *                             type: object
 *       404:
 *         description: Car provider not found
 */

/**
 * @swagger
 * /Car_Provider/{id}:
 *   put:
 *     summary: Update car provider
 *     tags: [Car Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Car provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               telephone_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Car provider updated successfully
 *       404:
 *         description: Car provider not found
 */

/**
 * @swagger
 * /Car_Provider/{id}:
 *   delete:
 *     summary: Delete car provider
 *     tags: [Car Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Car provider ID
 *     responses:
 *       200:
 *         description: Car provider deleted successfully
 *       404:
 *         description: Car provider not found
 */

/**
 * @swagger
 * /Car_Provider/register:
 *   post:
 *     summary: Register new car provider
 *     tags: [Car Providers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - telephone_number
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               telephone_number:
 *                 type: string
 *                 pattern: '^\d{3}-\d{7}$'
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Car provider registered successfully
 */

/**
 * @swagger
 * /Car_Provider/login:
 *   post:
 *     summary: Login car provider
 *     tags: [Car Providers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /Car_Provider/me:
 *   get:
 *     summary: Get current logged in provider
 *     tags: [Car Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current provider data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CarProvider'
 */

/**
 * @swagger
 * /Car_Provider/logout:
 *   post:
 *     summary: Logout car provider
 *     tags: [Car Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /Car_Provider/{id}/verify:
 *   post:
 *     summary: Verify car provider (Admin only)
 *     tags: [Car Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Car provider ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Provider verification status updated
 *       404:
 *         description: Car provider not found
 */

/**
 * @swagger
 * /Car_Provider/dashboard:
 *   get:
 *     summary: Get provider dashboard data
 *     tags: [Car Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider dashboard data
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
 *                     totalCars:
 *                       type: number
 *                     availableCars:
 *                       type: number
 *                     rentedCars:
 *                       type: number
 *                     carTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           count:
 *                             type: number
 *                     activeRentals:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         list:
 *                           type: array
 *                     pendingRentals:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         list:
 *                           type: array
 *                     monthlyRevenue:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                         count:
 *                           type: number
 *                     recentRentals:
 *                       type: array
 *                     rentalStats:
 *                       type: object
 *       403:
 *         description: Not authorized - Provider only
 *       500:
 *         description: Server error
 */