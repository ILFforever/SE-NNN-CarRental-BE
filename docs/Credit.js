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
 *         rental:
 *           type: string
 *           description: Associated rental ID (if applicable)
 * 
 * /credits:
 *   get:
 *     summary: Get current user's credit balance
 *     tags: [Credits]
 *     security:
 *     - bearerAuth: []
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
 *     security:
 *     - bearerAuth: []
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
 *     security:
 *     - bearerAuth: []
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
 *     security:
 *     - bearerAuth: []
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
 *     security:
 *     - bearerAuth: []
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
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum transaction amount
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum transaction amount
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
 *     security:
 *     - bearerAuth: []
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
 * /credits/topup/retrieve:
 *   get:
 *     summary: Process QR code payment for credit top-up
 *     tags: [Credits]
 *     parameters:
 *       - in: query
 *         name: trans_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID from QR code
 *     responses:
 *       200:
 *         description: Payment successfully processed
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered status page for successful transaction
 *       400:
 *         description: Transaction already processed or invalid
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered error status page
 *       404:
 *         description: Transaction expired or not found
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered error status page
 *       500:
 *         description: Server error during transaction processing
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered error status page
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
 *
 * /credits/refund:
 *   post:
 *     summary: Refund credits to a user or provider account
 *     tags: [Credits]
 *     security:
 *     - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to refund (optional)
 *               providerId:
 *                 type: string
 *                 description: Provider ID to refund (optional)
 *               amount:
 *                 type: number
 *                 description: Amount of credits to refund
 *               description:
 *                 type: string
 *                 description: Optional description for the refund
 *               reference:
 *                 type: string
 *                 description: Optional reference identifier
 *     responses:
 *       200:
 *         description: Credits refunded successfully
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
 *                     entityId:
 *                       type: string
 *                     entityType:
 *                       type: string
 *                     credits:
 *                       type: number
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *                 message:
 *                   type: string
 * 
 * /credits/admin/manage:
 *   post:
 *     summary: Admin management of entity credits
 *     tags: [Credits]
 *     security:
 *     - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to manage credits (optional)
 *               providerId:
 *                 type: string
 *                 description: Provider ID to manage credits (optional)
 *               action:
 *                 type: string
 *                 enum: ['add', 'use', 'refund']
 *                 description: Action to perform on credits
 *               amount:
 *                 type: number
 *                 description: Amount of credits to manage
 *               description:
 *                 type: string
 *                 description: Optional description for the transaction
 *               reference:
 *                 type: string
 *                 description: Optional reference identifier
 *               adminNote:
 *                 type: string
 *                 description: Optional administrative note
 *     responses:
 *       200:
 *         description: Credits managed successfully
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
 *                     entityId:
 *                       type: string
 *                     entityType:
 *                       type: string
 *                     credits:
 *                       type: number
 *                     transaction:
 *                       $ref: '#/components/schemas/Transaction'
 *                 message:
 *                   type: string
 * 
 * /credits/transactions:
 *   get:
 *     summary: Get all transactions (Admin only)
 *     tags: [Credits]
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter transactions by user ID
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Filter transactions by provider ID
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
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum transaction amount
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum transaction amount
 *       - in: query
 *         name: reference
 *         schema:
 *           type: string
 *         description: Filter by reference identifier
 *       - in: query
 *         name: rentalId
 *         schema:
 *           type: string
 *         description: Filter by rental ID
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
 *         description: List of all transactions
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
 * /credits/transactions/{id}:
 *   get:
 *     summary: Get a specific transaction by ID
 *     tags: [Credits]
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       403:
 *         description: Not authorized to view this transaction
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Transaction not found
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