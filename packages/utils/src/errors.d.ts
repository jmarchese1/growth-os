export declare class EmbedoError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class NotFoundError extends EmbedoError {
    constructor(resource: string, id?: string);
}
export declare class ValidationError extends EmbedoError {
    readonly fields?: Record<string, string[]>;
    constructor(message: string, fields?: Record<string, string[]>);
}
export declare class UnauthorizedError extends EmbedoError {
    constructor(message?: string);
}
export declare class ForbiddenError extends EmbedoError {
    constructor(message?: string);
}
export declare class ConflictError extends EmbedoError {
    constructor(message: string);
}
export declare class ExternalApiError extends EmbedoError {
    readonly service: string;
    readonly originalError?: unknown;
    constructor(service: string, message: string, originalError?: unknown);
}
export declare function isEmbedoError(error: unknown): error is EmbedoError;
//# sourceMappingURL=errors.d.ts.map