import cors from "cors";
import express, { Application, Request, Response } from "express";
import httpStatus from "http-status";
import mongoose from "mongoose";
import router from "./app/routes/router";
import pathNotFoundErrorHandler from "./errors/pathNotFoundErrorHandler";
import globalErrorHandler from "./middlewares/globalErrorHandler";

const app: Application = express();

// ? Middlewares:
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// * Basic Page
app.get("/", async (req: Request, res: Response) => {
  res.status(httpStatus.OK).send({
    message: "Rental-Portal-Management-System Server Running Successfully",
    statusCode: httpStatus.OK,
  });
});

// * Health Check Endpoint
app.get("/health", async (req: Request, res: Response) => {
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

//* Main endpoint
app.use("/api/v1.0", router);

// * Global Error Handler
app.use(globalErrorHandler);

// * Path Not Found Handler
app.use(pathNotFoundErrorHandler);

export default app;
