"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const isDev = process.env['NODE_ENV'] !== 'production';
exports.logger = (0, pino_1.default)({
    level: process.env['LOG_LEVEL'] ?? 'info',
    ...(isDev && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
    }),
});
function createLogger(name) {
    return exports.logger.child({ module: name });
}
//# sourceMappingURL=logger.js.map