/** 
 * @swagger 
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the transaction
 *         user:
 *           type: string
 *           description: User ID associated with the transaction (optional)
 *         provider:
 *           type: string
 *           description: Provider ID associated with the transaction (optional)
 *         amount:
 *           type: number
 *           description: Transaction amount
 *         description:
 *           type: string
 *           description: Transaction description
 *         type:
 *           type: string
 *           enum: ['deposit', 'withdrawal', 'payment', 'refund']
 *           description: Type of transaction
 *         transactionDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of the transaction
 *         reference:
 *           type: string
 *           description: Reference identifier for the transaction
 *         status:
 *           type: string
 *           enum: ['pending', 'completed', 'failed', 'reversed']
 *           description: Status of the transaction
 *         metadata:
 *           type: object
 *           description: Additional transaction metadata
 * 
 * /credits:
 *   get:
 *     summary: Get current user's credit balance
 *     tags: [Credits]
 *     responses:
 *       200:
 *         description: User's current credit balance
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
 *                     credits:
 *                       type: number
 * 
 * /credits/add:
 *   post:
 *     summary: Add credits to user/provider account
 *     tags: [Credits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of credits to add
 *               description:
 *                 type: string
 *                 description: Optional description for the transaction
 *               reference:
 *                 type: string
 *                 description: Optional reference identifier
 *     responses:
 *       200:
 *         description: Credits added successfully
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
 *                     credits:
 *                       type: number
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 * 
 * /credits/use:
 *   post:
 *     summary: Use credits for payment
 *     tags: [Credits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of credits to use
 *               description:
 *                 type: string
 *                 description: Optional description for the transaction
 *               reference:
 *                 type: string
 *                 description: Optional reference identifier
 *     responses:
 *       200:
 *         description: Credits used successfully
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
 *                     credits:
 *                       type: number
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 * 
 * /credits/pay-rental/{rentalId}:
 *   post:
 *     summary: Pay for a rental using credits
 *     tags: [Credits]
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rental paid successfully
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
 *                     rentalId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     remainingCredits:
 *                       type: number
 *                     rentalStatus:
 *                       type: string
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 * 
 * /credits/history:
 *   get:
 *     summary: Get user's transaction history
 *     tags: [Credits]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: ['deposit', 'withdrawal', 'payment', 'refund']
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['pending', 'completed', 'failed', 'reversed']
 *         description: Filter by transaction status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for transaction filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for transaction filter
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
 *         description: Transaction history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 total:
 *                   type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     prev:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                     next:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     deposits:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         total:
 *                           type: number
 *                     payments:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         total:
 *                           type: number
 *                     refunds:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         total:
 *                           type: number
 *                     withdrawals:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         total:
 *                           type: number
 *                     netFlow:
 *                       type: number
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentCredits:
 *                       type: number
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 * 
 * /credits/topup:
 *   post:
 *     summary: Generate QR code for top-up
 *     tags: [Credits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 description: User ID
 *               amount:
 *                 type: number
 *                 description: Amount to top up
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 transaction_id:
 *                   type: string
 *                 url:
 *                   type: string
 * 
 * /credits/topup/status:
 *   get:
 *     summary: Check QR code top-up transaction status
 *     tags: [Credits]
 *     parameters:
 *       - in: query
 *         name: trans_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction status retrieved successfully
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
 *                     uid:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: ['pending', 'completed', 'expired']
 */