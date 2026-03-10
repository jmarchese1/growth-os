"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.cuidSchema = exports.emailSchema = exports.phoneSchema = void 0;
exports.validate = validate;
const zod_1 = require("zod");
const errors_js_1 = require("./errors.js");
/**
 * Parse and validate data with a Zod schema, throwing a typed ValidationError on failure.
 */
function validate(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const fields = {};
        for (const issue of result.error.issues) {
            const path = issue.path.join('.');
            if (!fields[path])
                fields[path] = [];
            fields[path].push(issue.message);
        }
        throw new errors_js_1.ValidationError('Validation failed', fields);
    }
    return result.data;
}
// Common reusable Zod schemas
exports.phoneSchema = zod_1.z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number in E.164 format');
exports.emailSchema = zod_1.z.string().email('Must be a valid email address');
exports.cuidSchema = zod_1.z.string().cuid('Must be a valid ID');
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    pageSize: zod_1.z.coerce.number().int().positive().max(100).default(20),
    search: zod_1.z.string().optional(),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=validation.js.map