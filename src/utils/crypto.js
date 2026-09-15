"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.generateRandomToken = generateRandomToken;
exports.timingSafeEqual = timingSafeEqual;
var crypto_1 = require("crypto");
var index_1 = require("../config/index");
var ALGORITHM = 'aes-256-gcm';
var IV_LENGTH = 12;
var AUTH_TAG_LENGTH = 16;
function encrypt(text) {
    var iv = crypto_1.default.randomBytes(IV_LENGTH);
    var key = Buffer.from(index_1.config.ENCRYPTION_KEY, 'hex');
    var cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    var encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    var authTag = cipher.getAuthTag();
    return "".concat(iv.toString('hex'), ":").concat(authTag.toString('hex'), ":").concat(encrypted);
}
function decrypt(encryptedText) {
    var parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }
    var ivHex = parts[0], authTagHex = parts[1], encryptedData = parts[2];
    var iv = Buffer.from(ivHex, 'hex');
    var authTag = Buffer.from(authTagHex, 'hex');
    var key = Buffer.from(index_1.config.ENCRYPTION_KEY, 'hex');
    var decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    var decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
function generateRandomToken(bytes) {
    if (bytes === void 0) { bytes = 32; }
    return crypto_1.default.randomBytes(bytes).toString('hex');
}
function timingSafeEqual(a, b) {
    var bufA = Buffer.from(a);
    var bufB = Buffer.from(b);
    if (bufA.length !== bufB.length)
        return false;
    return crypto_1.default.timingSafeEqual(bufA, bufB);
}
