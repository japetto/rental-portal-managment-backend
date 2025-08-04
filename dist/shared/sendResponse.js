"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendResponse = (res, data) => {
    res.status(data.statusCode).send({
        success: data.success,
        statusCode: data.statusCode,
        message: data.message || "Success",
        data: data.data || null,
    });
};
exports.default = sendResponse;
