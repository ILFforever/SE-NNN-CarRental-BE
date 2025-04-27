/** 
 * @swagger 
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - rate
 *         - daily
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the service
 *         name:
 *           type: string
 *           description: Name of the service
 *           unique: true
 *         available:
 *           type: boolean
 *           description: Service availability status
 *           default: true
 *         description:
 *           type: string
 *           description: Detailed description of the service
 *         rate:
 *           type: number
 *           description: Price of the service
 *         daily:
 *           type: boolean
 *           description: Whether the service is charged daily or as a one-time fee
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date of service creation
 * 
 * /services:
 *   get:
 *     summary: Get all services
 *     tags: [Services]
 *     security:
 *     - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 * 
 *   post:
 *     summary: Create a new service
 *     tags: [Services]
 *     security:
 *     - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - rate
 *               - daily
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               rate:
 *                 type: number
 *               daily:
 *                 type: boolean
 *               available:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Service created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 * 
 * /services/{carId}:
 *   get:
 *     summary: Get services for a specific car
 *     tags: [Services]
 *     security:
 *     - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of services for the specified car
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 * 
 * /services/{id}:
 *   put:
 *     summary: Update a service
 *     tags: [Services]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               rate:
 *                 type: number
 *               daily:
 *                 type: boolean
 *               available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Service updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 */