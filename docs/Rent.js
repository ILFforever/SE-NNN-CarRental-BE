/** 
 * @swagger 
 * components:
 *   schemas:
 *     Rent:
 *       type: object
 *       required:
 *         - startDate
 *         - returnDate
 *         - car
 *         - user
 *         - price
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the rental
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Start date of the rental
 *         returnDate:
 *           type: string
 *           format: date-time
 *           description: Return date of the rental
 *         actualReturnDate:
 *           type: string
 *           format: date-time
 *           description: Actual date the car was returned
 *         status:
 *           type: string
 *           enum: ['pending', 'active', 'completed', 'cancelled', 'unpaid']
 *           description: Current status of the rental
 *         price:
 *           type: number
 *           description: Base rental price
 *         servicePrice:
 *           type: number
 *           description: Price of additional services
 *         discountAmount:
 *           type: number
 *           description: Discount applied to the rental
 *         finalPrice:
 *           type: number
 *           description: Final total price after discounts
 *         car:
 *           type: object
 *           description: Details of the rented car
 *           properties:
 *             _id:
 *               type: string
 *             brand:
 *               type: string
 *             model:
 *               type: string
 *         user:
 *           type: object
 *           description: Details of the user who rented the car
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         service:
 *           type: array
 *           items:
 *             type: string
 *           description: List of service IDs added to the rental
 *         isRated:
 *           type: boolean
 *           description: Whether the provider has been rated for this rental
 *         additionalCharges:
 *           type: object
 *           description: Any additional charges (e.g., late fees)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date of rental creation
 * 
 * /rents:
 *   get:
 *     summary: Get user's rentals
 *     tags: [Rentals]
 *     parameters:
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
 *     responses:
 *       200:
 *         description: List of user's rentals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
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
 *                     $ref: '#/components/schemas/Rent'
 * 
 *   post:
 *     summary: Create a new rental
 *     tags: [Rentals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - car
 *               - startDate
 *               - returnDate
 *               - price
 *             properties:
 *               car:
 *                 type: string
 *                 description: Car ID
 *               startDate:
 *                 type: string
 *                 format: date
 *               returnDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               returnTime:
 *                 type: string
 *               price:
 *                 type: number
 *               service:
 *                 type: array
 *                 items:
 *                   type: string
 *               payDeposit:
 *                 type: boolean
 *                 description: Optional flag to pay deposit with credits
 *     responses:
 *       201:
 *         description: Rental created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalPrice:
 *                   type: number
 *                 data:
 *                   $ref: '#/components/schemas/Rent'
 * 
 * /rents/{id}:
 *   get:
 *     summary: Get a specific rental by ID
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rental details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Rent'
 * 
 *   put:
 *     summary: Update a rental
 *     tags: [Rentals]
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
 *             description: Fields to update
 *     responses:
 *       200:
 *         description: Rental updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Rent'
 * 
 * /rents/{id}/complete:
 *   put:
 *     summary: Complete a rental (return car)
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rental completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 late_by:
 *                   type: number
 *                   description: Number of days late
 *                 late_fee:
 *                   type: number
 *                   description: Late fee amount
 *                 service_price:
 *                   type: number
 *                 discount_amount:
 *                   type: number
 *                 car_tier:
 *                   type: number
 *                 final_price:
 *                   type: number
 *                 data:
 *                   $ref: '#/components/schemas/Rent'
 * 
 * /rents/{id}/confirm:
 *   put:
 *     summary: Confirm a rental (change status from pending to active)
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rental confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Rent'
 * 
 * /rents/{id}/cancel:
 *   put:
 *     summary: Cancel a rental
 *     tags: [Rentals]
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
 *             description: Additional cancellation details
 *     responses:
 *       200:
 *         description: Rental cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Rent'
 * 
 * /rents/{id}/rate:
 *   post:
 *     summary: Rate the car provider for a rental
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5 stars
 *     responses:
 *       200:
 *         description: Provider rated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Updated provider review information
 * 
 * /rents/{id}/paid:
 *   put:
 *     summary: Mark a rental as paid (change from unpaid to completed)
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rental marked as paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Rent'
 *                 message:
 *                   type: string
 */