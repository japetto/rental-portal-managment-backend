import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import {
  ICreateServiceRequest,
  IUpdateServiceRequest,
} from "./service-requests.interface";
import { ServiceRequestService } from "./service-requests.service";

// Create service request
const createServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const payload: ICreateServiceRequest = req.body;
  const userId = req.user?._id?.toString();

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated",
      data: null,
    });
  }

  const result = await ServiceRequestService.createServiceRequest(
    payload,
    userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Service request created successfully",
    data: result,
  });
});

// Get service request by ID
const getServiceRequestById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?._id?.toString();
    const userRole = req.user?.role;

    if (!userId || !id) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "User not authenticated or invalid request ID",
        data: null,
      });
    }

    const result = await ServiceRequestService.getServiceRequestById(
      id,
      userId,
      userRole || "",
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service request retrieved successfully",
      data: result,
    });
  },
);

// Get service requests with filters and pagination
const getServiceRequests = catchAsync(async (req: Request, res: Response) => {
  const filters = req.query;
  const options = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: (req.query.sortBy as string) || "requestedDate",
    sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
  };
  const userId = req.user?._id?.toString();
  const userRole = req.user?.role;

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated",
      data: null,
    });
  }

  const result = await ServiceRequestService.getServiceRequests(
    filters,
    options,
    userId,
    userRole || "",
  );

  // Send response with data and include meta in the data object
  const responseData = {
    serviceRequests: result.data,
    pagination: result.meta,
  };

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service requests retrieved successfully",
    data: responseData,
  });
});

// Update service request
const updateServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload: IUpdateServiceRequest = req.body;
  const userId = req.user?._id?.toString();
  const userRole = req.user?.role;

  if (!userId || !id) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated or invalid request ID",
      data: null,
    });
  }

  const result = await ServiceRequestService.updateServiceRequest(
    id,
    payload,
    userId,
    userRole || "",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service request updated successfully",
    data: result,
  });
});

// Delete service request
const deleteServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?._id?.toString();
  const userRole = req.user?.role;

  if (!userId || !id) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated or invalid request ID",
      data: null,
    });
  }

  const result = await ServiceRequestService.deleteServiceRequest(
    id,
    userId,
    userRole || "",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// Get service request statistics (admin only)
const getServiceRequestStats = catchAsync(
  async (req: Request, res: Response) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "User not authenticated",
        data: null,
      });
    }

    const result = await ServiceRequestService.getServiceRequestStats(userRole);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service request statistics retrieved successfully",
      data: result,
    });
  },
);

export const ServiceRequestController = {
  createServiceRequest,
  getServiceRequestById,
  getServiceRequests,
  updateServiceRequest,
  deleteServiceRequest,
  getServiceRequestStats,
};
