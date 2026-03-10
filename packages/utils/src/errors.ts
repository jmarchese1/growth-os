// Typed error classes used across all services

export class EmbedoError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'EmbedoError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends EmbedoError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
      'NOT_FOUND',
    );
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends EmbedoError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    if (fields !== undefined) this.fields = fields;
  }
}

export class UnauthorizedError extends EmbedoError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends EmbedoError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends EmbedoError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class ExternalApiError extends EmbedoError {
  public readonly service: string;
  public readonly originalError?: unknown;

  constructor(service: string, message: string, originalError?: unknown) {
    super(`[${service}] ${message}`, 502, 'EXTERNAL_API_ERROR');
    this.name = 'ExternalApiError';
    this.service = service;
    this.originalError = originalError;
  }
}

export function isEmbedoError(error: unknown): error is EmbedoError {
  return error instanceof EmbedoError;
}
