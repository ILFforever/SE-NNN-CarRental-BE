/** 
 * @swagger 
 * components:
 *   schemas:
 *     QRTransaction:
 *       type: object
 *       properties:
 *         uid:
 *           type: string
 *           description: User ID associated with the transaction
 *         cash:
 *           type: number
 *           description: Amount of transaction
 *         status:
 *           type: string
 *           enum: ['pending', 'completed', 'expired']
 *           description: Status of the QR code transaction
 * 
 * /qrcode/topup:
 *   get:
 *     summary: Generate QR code for top-up
 *     tags: [QR Code]
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: cash
 *         required: true
 *         schema:
 *           type: number
 *         description: Amount to top up
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
 *                 url:
 *                   type: string
 *                   description: URL for the generated QR code
 * 
 * /qrcode/recieve:
 *   get:
 *     summary: Receive payment via QR code
 *     tags: [QR Code]
 *     parameters:
 *       - in: query
 *         name: trans_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID from QR code
 *     responses:
 *       200:
 *         description: Payment received successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered status page
 *       404:
 *         description: Transaction expired or not found
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Rendered error status page
 * 
 * /qrcode/verify:
 *   get:
 *     summary: Check QR code transaction status
 *     tags: [QR Code]
 *     parameters:
 *       - in: query
 *         name: trans_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID to verify
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
 *                 uid:
 *                   type: string
 *                   description: User ID associated with the transaction
 *                 cash:
 *                   type: number
 *                   description: Transaction amount
 *                 status:
 *                   type: string
 *                   enum: ['pending', 'completed', 'expired']
 *                   description: Current status of the transaction
 *       404:
 *         description: Transaction not found or expired
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