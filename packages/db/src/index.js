"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = exports.Prisma = exports.db = void 0;
var client_js_1 = require("./client.js");
Object.defineProperty(exports, "db", { enumerable: true, get: function () { return client_js_1.db; } });
var client_1 = require("@prisma/client");
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
//# sourceMappingURL=index.js.map