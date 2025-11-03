/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services
 *     description: |
 *       Returns a list of all available services in the system, sorted alphabetically by name.
 *       Each service includes its ID and name. This endpoint does not require authentication.
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idService:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Wyprowadzanie psów"
 *       500:
 *         description: Internal server error
 */