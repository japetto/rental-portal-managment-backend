import cors from "cors";
import express, { Application, Request, Response } from "express";
import httpStatus from "http-status";
import router from "./app/routes/router";
import pathNotFoundErrorHandler from "./errors/pathNotFoundErrorHandler";
import globalErrorHandler from "./middlewares/globalErrorHandler";

const app: Application = express();

// ? Middlewares:
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Configure JSON parsing for all routes except webhooks
app.use((req, res, next) => {
  if (req.path.includes("/stripe/webhook")) {
    // Skip JSON parsing for webhook routes
    next();
  } else {
    express.json()(req, res, next);
  }
});

// * Basic Page
app.get("/", async (req: Request, res: Response) => {
  res.status(httpStatus.OK).send({
    message: "Rental-Portal-Management-System Server Running Successfully",
    statusCode: httpStatus.OK,
  });
});

//* Main endpoint
app.use("/api/v1.0", router);

//* Global error Handler
app.use(globalErrorHandler);

//* Path Not Found Error Handler
app.use(pathNotFoundErrorHandler);

export default app;
