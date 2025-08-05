import httpStatus from "http-status";
import mongoose from "mongoose";
import ApiError from "../../../errors/ApiError";
import { restoreRecord, softDelete } from "../../../shared/softDeleteUtils";
import { Properties } from "../properties/properties.schema";
import { Spots } from "../spots/spots.schema";
import { Users } from "../users/users.schema";
import {
  ICreateServiceRequest,
  IServiceRequest,
  IUpdateServiceRequest,
} from "./service-requests.interface";
import { ServiceRequests } from "./service-requests.schema";

// Create service request
const createServiceRequest = async (
  payload: ICreateServiceRequest,
  userId: string,
): Promise<IServiceRequest> => {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format");
  }

  // Get user details to verify they're a tenant and get their property/spot info
  const user = await Users.findOne({ 
    _id: userId,
    isDeleted: false,
    isActive: true 
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found or account is deactivated");
  }

  if (user.role !== "TENANT") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only tenants can create service requests",
    );
  }

  if (!user.propertyId || !user.spotId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User must be assigned to a property and spot to create service requests",
    );
  }

  // Verify property and spot exist
  const property = await Properties.findById(user.propertyId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  const spot = await Spots.findById(user.spotId);
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found");
  }

  // Create service request with user's property and spot info
  const serviceRequestData = {
    ...payload,
    tenantId: userId,
    propertyId: user.propertyId,
    spotId: user.spotId,
  };

  const serviceRequest = await ServiceRequests.create(serviceRequestData);

  // Populate references for response
  const populatedRequest = await ServiceRequests.findById(serviceRequest._id)
    .populate("tenantId", "name email phoneNumber")
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber status");

  return populatedRequest!;
};

// Get service request by ID
const getServiceRequestById = async (
  requestId: string,
  userId: string,
  userRole: string,
): Promise<IServiceRequest> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid service request ID format",
    );
  }

  const serviceRequest = await ServiceRequests.findOne({
    _id: requestId,
    isDeleted: false,
  })
    .populate("tenantId", "name email phoneNumber")
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber status");

  if (!serviceRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service request not found");
  }

  // Check access permissions
  if (
    userRole !== "SUPER_ADMIN" &&
    serviceRequest.tenantId.toString() !== userId
  ) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  return serviceRequest;
};

// Get service requests with filters and pagination
const getServiceRequests = async (
  filters: Record<string, unknown>,
  options: any,
  userId: string,
  userRole: string,
) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "requestedDate";
  const sortOrder = options.sortOrder === "asc" ? 1 : -1;

  // Build filter conditions
  const filterConditions: Record<string, unknown> = {
    isDeleted: false, // Only get non-deleted records
  };

  // Add filters
  if (filters.status) {
    filterConditions.status = filters.status;
  }
  if (filters.priority) {
    filterConditions.priority = filters.priority;
  }
  if (filters.type) {
    filterConditions.type = filters.type;
  }

  // Role-based filtering
  if (userRole !== "SUPER_ADMIN") {
    // Tenants can only see their own requests
    filterConditions.tenantId = userId;
  }

  // Build sort conditions
  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder;

  const serviceRequests = await ServiceRequests.find(filterConditions)
    .populate("tenantId", "name email phoneNumber")
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber status")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await ServiceRequests.countDocuments(filterConditions);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: serviceRequests,
  };
};

// Update service request (tenant can only update certain fields)
const updateServiceRequest = async (
  requestId: string,
  payload: IUpdateServiceRequest,
  userId: string,
  userRole: string,
): Promise<IServiceRequest> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid service request ID format",
    );
  }

  const serviceRequest = await ServiceRequests.findOne({
    _id: requestId,
    isDeleted: false,
  });
  if (!serviceRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service request not found");
  }

  // Check access permissions
  if (
    userRole !== "SUPER_ADMIN" &&
    serviceRequest.tenantId.toString() !== userId
  ) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  // Tenants can only update certain fields and only if status is PENDING
  if (userRole !== "SUPER_ADMIN") {
    if (serviceRequest.status !== "PENDING") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot update service request that is not in PENDING status",
      );
    }

    // Remove admin-only fields from payload
    const {
      status,
      completedDate,
      assignedTo,
      estimatedCost,
      actualCost,
      adminNotes,
      ...tenantAllowedFields
    } = payload;

    const updatedRequest = await ServiceRequests.findByIdAndUpdate(
      requestId,
      tenantAllowedFields,
      { new: true, runValidators: true },
    )
      .populate("tenantId", "name email phoneNumber")
      .populate("propertyId", "name address")
      .populate("spotId", "spotNumber status");

    return updatedRequest!;
  }

  // Admin can update all fields
  const updatedRequest = await ServiceRequests.findByIdAndUpdate(
    requestId,
    payload,
    { new: true, runValidators: true },
  )
    .populate("tenantId", "name email phoneNumber")
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber status");

  return updatedRequest!;
};

// Delete service request
const deleteServiceRequest = async (
  requestId: string,
  userId: string,
  userRole: string,
): Promise<{ message: string }> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid service request ID format",
    );
  }

  const serviceRequest = await ServiceRequests.findOne({
    _id: requestId,
    isDeleted: false,
  });
  if (!serviceRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service request not found");
  }

  // Check access permissions
  if (
    userRole !== "SUPER_ADMIN" &&
    serviceRequest.tenantId.toString() !== userId
  ) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  // Only allow deletion if status is PENDING
  if (serviceRequest.status !== "PENDING") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete service request that is not in PENDING status",
    );
  }

  await softDelete(ServiceRequests, requestId);

  return {
    message: "Service request deleted successfully",
  };
};

// Get service request statistics (admin only)
const getServiceRequestStats = async (userRole: string) => {
  if (userRole !== "SUPER_ADMIN") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only admins can view statistics");
  }

  const stats = await ServiceRequests.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const priorityStats = await ServiceRequests.aggregate([
    {
      $group: {
        _id: "$priority",
        count: { $sum: 1 },
      },
    },
  ]);

  const typeStats = await ServiceRequests.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalRequests = await ServiceRequests.countDocuments();
  const pendingRequests = await ServiceRequests.countDocuments({
    status: "PENDING",
  });
  const urgentRequests = await ServiceRequests.countDocuments({
    priority: "URGENT",
    status: { $ne: "COMPLETED" },
  });

  return {
    total: totalRequests,
    pending: pendingRequests,
    urgent: urgentRequests,
    byStatus: stats,
    byPriority: priorityStats,
    byType: typeStats,
  };
};

// Archive a service request (soft delete)
const archiveServiceRequest = async (
  requestId: string,
  userId: string,
  userRole: string,
): Promise<{ message: string }> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid service request ID format",
    );
  }

  const serviceRequest = await ServiceRequests.findOne({
    _id: requestId,
    isDeleted: false,
  });
  if (!serviceRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service request not found");
  }

  // Check access permissions
  if (
    userRole !== "SUPER_ADMIN" &&
    serviceRequest.tenantId.toString() !== userId
  ) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  // Only allow archiving if status is PENDING or COMPLETED
  if (serviceRequest.status === "IN_PROGRESS") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot archive service request that is in progress",
    );
  }

  await softDelete(ServiceRequests, requestId, userId);

  return {
    message: "Service request archived successfully",
  };
};

// Restore a service request
const restoreServiceRequest = async (
  requestId: string,
  userId: string,
  userRole: string,
): Promise<{ message: string }> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid service request ID format",
    );
  }

  const serviceRequest = await ServiceRequests.findOne({
    _id: requestId,
    isDeleted: true,
  });
  if (!serviceRequest) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Service request not found or not archived",
    );
  }

  // Check access permissions
  if (
    userRole !== "SUPER_ADMIN" &&
    serviceRequest.tenantId.toString() !== userId
  ) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }

  await restoreRecord(ServiceRequests, requestId, userId);

  return {
    message: "Service request restored successfully",
  };
};

// Get archived service requests
const getArchivedServiceRequests = async (
  userId: string,
  userRole: string,
  filters: Record<string, unknown> = {},
  options: any = {},
) => {
  if (userRole !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only admins can view archived service requests",
    );
  }

  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "deletedAt";
  const sortOrder = options.sortOrder === "asc" ? 1 : -1;

  // Build filter conditions for deleted records
  const filterConditions: Record<string, unknown> = {
    isDeleted: true,
    ...filters,
  };

  // Build sort conditions
  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder;

  const serviceRequests = await ServiceRequests.find(filterConditions)
    .populate("tenantId", "name email phoneNumber")
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber status")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await ServiceRequests.countDocuments(filterConditions);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: serviceRequests,
  };
};

export const ServiceRequestService = {
  createServiceRequest,
  getServiceRequestById,
  getServiceRequests,
  updateServiceRequest,
  deleteServiceRequest,
  getServiceRequestStats,
  archiveServiceRequest,
  restoreServiceRequest,
  getArchivedServiceRequests,
};
