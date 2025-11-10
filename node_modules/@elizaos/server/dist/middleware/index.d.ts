/**
 * Consolidated middleware for the ElizaOS server
 * All middleware is organized into logical modules for better maintainability
 */
export { apiKeyAuthMiddleware } from './auth';
export { securityMiddleware } from './security';
export { createApiRateLimit, createFileSystemRateLimit, createUploadRateLimit, createChannelValidationRateLimit, } from './rate-limit';
export { agentExistsMiddleware, validateUuidMiddleware, validateChannelIdMiddleware, validateContentTypeMiddleware, } from './validation';
