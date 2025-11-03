/**
 * @swagger
 * /api/service-provider/become:
 *   post:
 *     summary: Become a service provider
 *     description: |
 *       Converts the currently authenticated user to a service provider role.
 *       Requires a valid Firebase ID token in the Authorization header.
 *       If the user was previously a service provider (but inactive), it reactivates the role and sets all associated advertisements back to ACTIVE status.
 *       User must not already be an active service provider.
 *     tags: [Service Provider]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User successfully became a service provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User is now a service provider"
 *                 serviceProviderId:
 *                   type: integer
 *                   example: 42
 *                   description: ID of the service provider record
 *       400:
 *         description: Bad request (user is already a service provider or admin)
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/service-provider/unbecome:
 *   delete:
 *     summary: Deactivate service provider role
 *     description: |
 *       Deactivates the service provider role for the currently authenticated user and sets all associated advertisements to INACTIVE status.
 *       Requires a valid Firebase ID token in the Authorization header.
 *       User must currently be an active service provider.
 *       This preserves all related data (advertisements, bookings, etc.) for potential reactivation.
 *     tags: [Service Provider]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Service provider role deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Service provider role deactivated successfully"
 *       400:
 *         description: Bad request (user is not a service provider)
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Internal server error
 */