"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_router_1 = require("../modules/admin/admin.router");
const announcements_router_1 = require("../modules/announcements/announcements.router");
const leases_router_1 = require("../modules/leases/leases.router");
const payments_router_1 = require("../modules/payments/payments.router");
const service_requests_router_1 = require("../modules/service-requests/service-requests.router");
const stripe_router_1 = require("../modules/stripe/stripe.router");
const users_router_1 = require("../modules/users/users.router");
const router = express_1.default.Router();
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
