"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMultipleSettingsSchema = exports.updateSettingSchema = void 0;
var zod_1 = require("zod");
exports.updateSettingSchema = zod_1.z.object({
    value: zod_1.z.any(),
});
exports.updateMultipleSettingsSchema = zod_1.z.object({
    settings: zod_1.z.record(zod_1.z.any()),
});
