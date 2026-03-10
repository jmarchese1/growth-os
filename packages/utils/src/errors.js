"use strict";
// Typed error classes used across all services
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalApiError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.NotFoundError = exports.EmbedoError = void 0;
exports.isEmbedoError = isEmbedoError;
class EmbedoError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'EmbedoError';
        this.statusCode = statusCode;
        this.code = code;
    }
}
exports.EmbedoError = EmbedoError;
class NotFoundError extends EmbedoError {
    constructor(resource, id) {
        super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends EmbedoError {
    fields;
    constructor(message, fields) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        if (fields !== undefined)
            this.fields = fields;
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends EmbedoError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends EmbedoError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends EmbedoError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class ExternalApiError extends EmbedoError {
    service;
    originalError;
    constructor(service, message, originalError) {
        super(`[${service}] ${message}`, 502, 'EXTERNAL_API_ERROR');
        this.name = 'ExternalApiError';
        this.service = service;
        this.originalError = originalError;
    }
}
exports.ExternalApiError = ExternalApiError;
function isEmbedoError(error) {
    return error instanceof EmbedoError;
}
//# sourceMappingURL=errors.js.map