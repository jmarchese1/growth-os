export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
}
export interface PaginationQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface WebhookPayload {
    id: string;
    type: string;
    createdAt: string;
    data: Record<string, unknown>;
}
//# sourceMappingURL=api.types.d.ts.map