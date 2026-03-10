"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayjs = void 0;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.addHours = addHours;
exports.isInPast = isInPast;
exports.hoursUntil = hoursUntil;
const dayjs_1 = __importDefault(require("dayjs"));
exports.dayjs = dayjs_1.default;
const utc_js_1 = __importDefault(require("dayjs/plugin/utc.js"));
const timezone_js_1 = __importDefault(require("dayjs/plugin/timezone.js"));
dayjs_1.default.extend(utc_js_1.default);
dayjs_1.default.extend(timezone_js_1.default);
function formatDate(date, format = 'MMMM D, YYYY') {
    return (0, dayjs_1.default)(date).format(format);
}
function formatDateTime(date, tz) {
    const d = tz ? (0, dayjs_1.default)(date).tz(tz) : (0, dayjs_1.default)(date);
    return d.format('MMMM D, YYYY [at] h:mm A');
}
function addHours(date, hours) {
    return (0, dayjs_1.default)(date).add(hours, 'hour').toDate();
}
function isInPast(date) {
    return (0, dayjs_1.default)(date).isBefore((0, dayjs_1.default)());
}
function hoursUntil(date) {
    return (0, dayjs_1.default)(date).diff((0, dayjs_1.default)(), 'hour');
}
//# sourceMappingURL=date.js.map