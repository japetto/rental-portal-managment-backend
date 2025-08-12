"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = __importDefault(require("mongoose"));
const router_1 = __importDefault(require("./app/routes/router"));
const pathNotFoundErrorHandler_1 = __importDefault(require("./errors/pathNotFoundErrorHandler"));
const globalErrorHandler_1 = __importDefault(require("./middlewares/globalErrorHandler"));
const app = (0, express_1.default)();
// ? Middlewares:
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// * Basic Page
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(http_status_1.default.OK).send({
        message: "Rental-Portal-Management-System Server Running Successfully",
        statusCode: http_status_1.default.OK,
    });
}));
// * Health Check Endpoint
app.get("/health", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check database connection
        const dbStatus = mongoose_1.default.connection.readyState;
        const dbConnected = dbStatus === 1; // 1 = connected
        const healthStatus = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
            database: {
                status: dbConnected ? "connected" : "disconnected",
                readyState: dbStatus,
            },
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            },
            version: process.version,
        };
        const statusCode = dbConnected
            ? http_status_1.default.OK
            : http_status_1.default.SERVICE_UNAVAILABLE;
        res.status(statusCode).json({
            success: dbConnected,
            statusCode,
            message: dbConnected
                ? "Service is healthy"
                : "Service is unhealthy - database disconnected",
            data: healthStatus,
        });
    }
    catch (error) {
        res.status(http_status_1.default.INTERNAL_SERVER_ERROR).json({
            success: false,
            statusCode: http_status_1.default.INTERNAL_SERVER_ERROR,
            message: "Health check failed",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}));
//* Main endpoint
app.use("/api/v1.0", router_1.default);
// * Global Error Handler
app.use(globalErrorHandler_1.default);
// * Path Not Found Handler
app.use(pathNotFoundErrorHandler_1.default);
exports.default = app;
