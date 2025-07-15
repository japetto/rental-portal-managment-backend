"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendResponse = (res, data) => {
    res.status(data.statusCode).send({
        success: true,
        statusCode: data.statusCode,
        message: data.message,
        data: data.data || null,
    });
};
exports.default = sendResponse;
