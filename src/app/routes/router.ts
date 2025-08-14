import express from "express";
import httpStatus from "http-status";
import mongoose from "mongoose";
import { AdminRouter } from "../modules/admin/admin.router";
import { AnnouncementRouter } from "../modules/announcements/announcements.router";
import { DocumentsRoutes } from "../modules/documents/documents.router";
import { LeasesRoutes } from "../modules/leases/leases.router";
import { paymentRoutes } from "../modules/payments/payments.router";
import { ServiceRequestRouter } from "../modules/service-requests/service-requests.router";
import { stripeRoutes } from "../modules/stripe/stripe.router";
import { UserRouter } from "../modules/users/users.router";

const router = express.Router();

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState;
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
      ? httpStatus.OK
      : httpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode).json({
      success: dbConnected,
      statusCode,
      message: dbConnected
        ? "Service is healthy"
        : "Service is unhealthy - database disconnected",
      data: healthStatus,
    });
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const routes = [
  {
    path: "/users",
    route: UserRouter,
  },
  {
    path: "/admin",
    route: AdminRouter,
  },
  {
    path: "/announcements",
    route: AnnouncementRouter,
  },
  {
    path: "/documents",
    route: DocumentsRoutes,
  },
  {
    path: "/leases",
    route: LeasesRoutes,
  },
  {
    path: "/service-requests",
    route: ServiceRequestRouter,
  },
  {
    path: "/stripe",
    route: stripeRoutes,
  },
  {
    path: "/payments",
    route: paymentRoutes,
  },
];

routes.map(r => router.use(r.path, r.route));

export default router;
