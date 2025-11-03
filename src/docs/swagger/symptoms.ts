/**
 * @swagger
 * /api/symptoms:
 *   get:
 *     summary: Retrieve a list of all symptoms
 *     description: |
 *       Returns all symptoms ordered by their `idSymptom`.
 *       Requires a valid Firebase authentication token and the user must be a client.
 *     tags: [Symptoms]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A JSON object containing an array of symptoms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 symptoms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idSymptom:
 *                         type: integer
 *                         example: 1
 *                       code:
 *                         type: string
 *                         example: "vomiting"
 *                       name:
 *                         type: string
 *                         example: "Wymioty"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: "Zwracanie treści pokarmowej."
 *                       defaultSeverity:
 *                         type: string
 *                         example: "MODERATE"
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       403:
 *         description: Forbidden (user is not a client)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */