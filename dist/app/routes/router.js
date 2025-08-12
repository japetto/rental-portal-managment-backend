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
const express_1 = __importDefault(require("express"));
const http_status_1 = __importDefault(require("http-status"));
const mongoose_1 = __importDefault(require("mongoose"));
const admin_router_1 = require("../modules/admin/admin.router");
const announcements_router_1 = require("../modules/announcements/announcements.router");
const leases_router_1 = require("../modules/leases/leases.router");
const payments_router_1 = require("../modules/payments/payments.router");
const service_requests_router_1 = require("../modules/service-requests/service-requests.router");
const stripe_router_1 = require("../modules/stripe/stripe.router");
const users_router_1 = require("../modules/users/users.router");
const router = express_1.default.Router();
// Health check endpoint
router.get("/health", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
const routes = [
    {
        path: "/users",
        route: users_router_1.UserRouter,
    },
    {
        path: "/admin",
        route: admin_router_1.AdminRouter,
    },
    {
        path: "/announcements",
        route: announcements_router_1.AnnouncementRouter,
    },
    {
        path: "/leases",
        route: leases_router_1.LeasesRoutes,
    },
    {
        path: "/service-requests",
        route: service_requests_router_1.ServiceRequestRouter,
    },
    {
        path: "/stripe",
        route: stripe_router_1.stripeRoutes,
    },
    {
        path: "/payments",
        route: payments_router_1.paymentRoutes,
    },
];
routes.map(r => router.use(r.path, r.route));
exports.default = router;
