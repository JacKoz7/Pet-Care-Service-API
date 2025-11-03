/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: Retrieve a list of all cities
 *     description: Returns all cities ordered by their `idCity`.
 *     tags: [Cities]
 *     responses:
 *       200:
 *         description: A JSON object containing an array of cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idCity:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Warszawa"
 *                       imageUrl:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/city.jpg"
 *       500:
 *         description: Failed to fetch cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch cities"
 */