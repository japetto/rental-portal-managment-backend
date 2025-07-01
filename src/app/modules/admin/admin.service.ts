import httpStatus from "http-status";
import mongoose from "mongoose";
import ApiError from "../../../errors/ApiError";
import { IProperty } from "../properties/properties.interface";
import { Properties } from "../properties/properties.schema";
import { IServiceRequest } from "../service-requests/service-requests.interface";
import { ServiceRequests } from "../service-requests/service-requests.schema";
import { ISpot } from "../spots/spots.interface";
import { Spots } from "../spots/spots.schema";
import { IUser } from "../users/users.interface";
import { Users } from "../users/users.schema";
import {
  IAdminUpdateUser,
  ICreateProperty,
  ICreateSpot,
  IInviteTenant,
  IUpdateProperty,
  IUpdateSpot,
} from "./admin.interface";

const inviteTenant = async (
  inviteData: IInviteTenant,
): Promise<{
  user: IUser;
  property: IProperty;
  spot: ISpot;
}> => {
  // Validate ObjectId format for propertyId
  if (!mongoose.Types.ObjectId.isValid(inviteData.propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  // Validate ObjectId format for spotId
  if (!mongoose.Types.ObjectId.isValid(inviteData.spotId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid spot ID format");
  }

  // Check if property exists
  const property = await Properties.findById(inviteData.propertyId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  // Check if spot exists and belongs to the property
  const spot = await Spots.findOne({
    _id: inviteData.spotId,
    propertyId: inviteData.propertyId,
  });
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found in this property");
  }

  // Check if spot is available
  if (spot.status !== "AVAILABLE") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Spot is not available");
  }

  // Check if user already exists with this email
  const existingUser = await Users.findOne({ email: inviteData.email });
  if (existingUser) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  // Check if user already exists with this phone number
  const existingUserByPhone = await Users.findOne({
    phoneNumber: inviteData.phoneNumber,
  });
  if (existingUserByPhone) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "User with this phone number already exists",
    );
  }

  // Check if spot is already assigned to another user
  const existingSpotUser = await Users.findOne({ spotId: inviteData.spotId });
  if (existingSpotUser) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Spot is already assigned to tenant: ${existingSpotUser.name}`,
    );
  }

  // Generate a temporary password (tenant will change it on first login)
  const tempPassword =
    Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

  // Create the user with tenant role and invitation status
  const userData = {
    name: inviteData.name,
    email: inviteData.email,
    phoneNumber: inviteData.phoneNumber,
    password: tempPassword,
    confirmPassword: tempPassword,
    role: "TENANT" as const,
    isInvited: true,
    isVerified: false,
    preferredLocation: inviteData.preferredLocation || property.address.city, // Use provided location or default to property city
    propertyId: inviteData.propertyId,
    spotId: inviteData.spotId,
  };

  const user = await Users.create(userData);

  // Update spot status to RESERVED
  await Spots.findByIdAndUpdate(inviteData.spotId, { status: "RESERVED" });

  // Update property available lots count
  await Properties.findByIdAndUpdate(inviteData.propertyId, {
    $inc: { availableLots: -1 },
  });

  return {
    user,
    property,
    spot,
  };
};

const createProperty = async (
  propertyData: ICreateProperty,
): Promise<IProperty> => {
  // Check if property with same name already exists
  const existingProperty = await Properties.findOne({
    name: propertyData.name,
  });
  if (existingProperty) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Property with this name already exists",
    );
  }

  // Create the property with available lots equal to total lots
  const property = await Properties.create({
    ...propertyData,
    availableLots: propertyData.totalLots,
  });

  return property;
};

const getAllProperties = async (): Promise<IProperty[]> => {
  const properties = await Properties.find({}).sort({ createdAt: -1 });
  return properties;
};

const getPropertyById = async (propertyId: string): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  const property = await Properties.findById(propertyId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  return property;
};

const updateProperty = async (
  propertyId: string,
  updateData: IUpdateProperty,
): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  const property = await Properties.findById(propertyId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  // If updating totalLots, recalculate availableLots
  if (updateData.totalLots !== undefined) {
    const occupiedLots = property.totalLots - property.availableLots;
    if (updateData.totalLots < occupiedLots) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot reduce total lots below occupied lots",
      );
    }
    updateData.availableLots = updateData.totalLots - occupiedLots;
  }

  const updatedProperty = await Properties.findByIdAndUpdate(
    propertyId,
    updateData,
    { new: true, runValidators: true },
  );

  return updatedProperty!;
};

const deleteProperty = async (propertyId: string): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  const property = await Properties.findById(propertyId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  // Check if property has any tenants
  const tenantsCount = await Users.countDocuments({ propertyId });
  if (tenantsCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete property with existing tenants",
    );
  }

  // Check if property has any spots
  const spotsCount = await Spots.countDocuments({ propertyId });
  if (spotsCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete property with existing spots",
    );
  }

  await Properties.findByIdAndDelete(propertyId);
};

const createSpot = async (spotData: ICreateSpot): Promise<ISpot> => {
  // Validate ObjectId format for propertyId
  if (!mongoose.Types.ObjectId.isValid(spotData.propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  // Check if property exists
  const property = await Properties.findById(spotData.propertyId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  // Check if property is active
  if (!property.isActive) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot create spots for inactive property",
    );
  }

  // Check if spot number already exists in this property
  const existingSpot = await Spots.findOne({
    propertyId: spotData.propertyId,
    spotNumber: spotData.spotNumber,
  });
  if (existingSpot) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Spot number already exists in this property",
    );
  }

  // Check if adding this spot would exceed property's total lots
  const currentSpotsCount = await Spots.countDocuments({
    propertyId: spotData.propertyId,
  });
  if (currentSpotsCount >= property.totalLots) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot create more spots than the property's total lots capacity",
    );
  }

  // Create the spot
  const spot = await Spots.create({
    ...spotData,
    status: "AVAILABLE",
    isActive: true,
  });

  // Update property's available lots count
  await Properties.findByIdAndUpdate(spotData.propertyId, {
    $inc: { availableLots: 1 },
  });

  return spot;
};

const getSpotsByProperty = async (
  propertyId: string,
  status?: string,
): Promise<ISpot[]> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  // Check if property exists
  const property = await Properties.findById(propertyId);
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  // Build query
  const query: any = { propertyId };

  // Add status filter if provided
  if (status) {
    const validStatuses = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED"];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid status. Must be one of: AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED",
      );
    }
    query.status = status.toUpperCase();
  }

  const spots = await Spots.find(query).sort({ spotNumber: 1 });
  return spots;
};

const getSpotById = async (spotId: string): Promise<ISpot> => {
  if (!mongoose.Types.ObjectId.isValid(spotId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid spot ID format");
  }

  const spot = await Spots.findById(spotId);
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found");
  }

  return spot;
};

const updateSpot = async (
  spotId: string,
  updateData: IUpdateSpot,
): Promise<ISpot> => {
  if (!mongoose.Types.ObjectId.isValid(spotId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid spot ID format");
  }

  const spot = await Spots.findById(spotId);
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found");
  }

  // If updating spot number, check for uniqueness within the property
  if (updateData.spotNumber && updateData.spotNumber !== spot.spotNumber) {
    const existingSpot = await Spots.findOne({
      propertyId: spot.propertyId,
      spotNumber: updateData.spotNumber,
      _id: { $ne: spotId },
    });
    if (existingSpot) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Spot number already exists in this property",
      );
    }
  }

  const updatedSpot = await Spots.findByIdAndUpdate(spotId, updateData, {
    new: true,
    runValidators: true,
  });

  return updatedSpot!;
};

const deleteSpot = async (spotId: string): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(spotId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid spot ID format");
  }

  const spot = await Spots.findById(spotId);
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found");
  }

  // Check if spot is occupied
  if (spot.status === "OCCUPIED") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete an occupied spot",
    );
  }

  // Check if spot is reserved
  if (spot.status === "RESERVED") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete a reserved spot");
  }

  await Spots.findByIdAndDelete(spotId);

  // Update property's available lots count
  await Properties.findByIdAndUpdate(spot.propertyId, {
    $inc: { availableLots: -1 },
  });
};

const getAllTenants = async (): Promise<IUser[]> => {
  const tenants = await Users.find({ role: "TENANT" })
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber status size price description")
    .sort({ createdAt: -1 });

  // Transform the data to include lot number more prominently
  const tenantsWithLotNumber = tenants.map(tenant => {
    const tenantData = tenant.toObject() as any;

    // Add lot number as a direct field for easier access
    if (tenantData.spotId && typeof tenantData.spotId === "object") {
      tenantData.lotNumber = tenantData.spotId.spotNumber;
      tenantData.lotStatus = tenantData.spotId.status;
      tenantData.lotSize = tenantData.spotId.size;
      tenantData.lotPrice = tenantData.spotId.price;
      tenantData.lotDescription = tenantData.spotId.description;
    }

    return tenantData;
  });

  return tenantsWithLotNumber;
};

// Get all service requests with full details (Admin only)
const getAllServiceRequests = async (
  filters: Record<string, unknown>,
  options: any,
) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "requestedDate";
  const sortOrder = options.sortOrder === "asc" ? 1 : -1;

  // Build filter conditions
  const filterConditions: Record<string, unknown> = {};

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
  if (filters.propertyId) {
    filterConditions.propertyId = filters.propertyId;
  }
  if (filters.tenantId) {
    filterConditions.tenantId = filters.tenantId;
  }

  // Build sort conditions
  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder;

  const serviceRequests = await ServiceRequests.find(filterConditions)
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation emergencyContact",
    )
    .populate(
      "propertyId",
      "name description address amenities totalLots availableLots isActive images rules",
    )
    .populate(
      "spotId",
      "spotNumber status size amenities hookups price description images isActive",
    )
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

// Get service request by ID with full details (Admin only)
const getServiceRequestById = async (
  requestId: string,
): Promise<IServiceRequest> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid service request ID format",
    );
  }

  const serviceRequest = await ServiceRequests.findById(requestId)
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation emergencyContact",
    )
    .populate(
      "propertyId",
      "name description address amenities totalLots availableLots isActive images rules",
    )
    .populate(
      "spotId",
      "spotNumber status size amenities hookups price description images isActive",
    );

  if (!serviceRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service request not found");
  }

  return serviceRequest;
};

// Update service request status and details (Admin only)
const updateServiceRequest = async (
  requestId: string,
  updateData: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    estimatedCost?: number;
    actualCost?: number;
    completedDate?: Date;
    adminNotes?: string;
    images?: string[];
  },
): Promise<IServiceRequest> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid service request ID format",
    );
  }

  const serviceRequest = await ServiceRequests.findById(requestId);
  if (!serviceRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service request not found");
  }

  // If status is being updated to COMPLETED, set completedDate if not provided
  if (updateData.status === "COMPLETED" && !updateData.completedDate) {
    updateData.completedDate = new Date();
  }

  const updatedRequest = await ServiceRequests.findByIdAndUpdate(
    requestId,
    updateData,
    { new: true, runValidators: true },
  )
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation emergencyContact",
    )
    .populate(
      "propertyId",
      "name description address amenities totalLots availableLots isActive images rules",
    )
    .populate(
      "spotId",
      "spotNumber status size amenities hookups price description images isActive",
    );

  return updatedRequest!;
};

// Add admin comment to service request
const addAdminComment = async (
  requestId: string,
  comment: string,
): Promise<IServiceRequest> => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid service request ID format",
    );
  }

  const serviceRequest = await ServiceRequests.findById(requestId);
  if (!serviceRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service request not found");
  }

  // Append new comment to existing admin notes
  const timestamp = new Date().toISOString();
  const newComment = `[${timestamp}] ${comment}\n`;
  const updatedAdminNotes = serviceRequest.adminNotes
    ? serviceRequest.adminNotes + "\n" + newComment
    : newComment;

  const updatedRequest = await ServiceRequests.findByIdAndUpdate(
    requestId,
    { adminNotes: updatedAdminNotes },
    { new: true, runValidators: true },
  )
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation emergencyContact",
    )
    .populate(
      "propertyId",
      "name description address amenities totalLots availableLots isActive images rules",
    )
    .populate(
      "spotId",
      "spotNumber status size amenities hookups price description images isActive",
    );

  return updatedRequest!;
};

// Get service requests by property (Admin only)
const getServiceRequestsByProperty = async (
  propertyId: string,
  filters: Record<string, unknown>,
  options: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "requestedDate";
  const sortOrder = options.sortOrder === "asc" ? 1 : -1;

  // Build filter conditions
  const filterConditions: Record<string, unknown> = { propertyId };

  // Add additional filters
  if (filters.status) {
    filterConditions.status = filters.status;
  }
  if (filters.priority) {
    filterConditions.priority = filters.priority;
  }
  if (filters.type) {
    filterConditions.type = filters.type;
  }

  // Build sort conditions
  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder;

  const serviceRequests = await ServiceRequests.find(filterConditions)
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation emergencyContact",
    )
    .populate(
      "propertyId",
      "name description address amenities totalLots availableLots isActive images rules",
    )
    .populate(
      "spotId",
      "spotNumber status size amenities hookups price description images isActive",
    )
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

// Get service requests by tenant (Admin only)
const getServiceRequestsByTenant = async (
  tenantId: string,
  filters: Record<string, unknown>,
  options: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid tenant ID format");
  }

  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "requestedDate";
  const sortOrder = options.sortOrder === "asc" ? 1 : -1;

  // Build filter conditions
  const filterConditions: Record<string, unknown> = { tenantId };

  // Add additional filters
  if (filters.status) {
    filterConditions.status = filters.status;
  }
  if (filters.priority) {
    filterConditions.priority = filters.priority;
  }
  if (filters.type) {
    filterConditions.type = filters.type;
  }

  // Build sort conditions
  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder;

  const serviceRequests = await ServiceRequests.find(filterConditions)
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation emergencyContact",
    )
    .populate(
      "propertyId",
      "name description address amenities totalLots availableLots isActive images rules",
    )
    .populate(
      "spotId",
      "spotNumber status size amenities hookups price description images isActive",
    )
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

// Get urgent service requests (Admin only)
const getUrgentServiceRequests = async (options: any) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const filterConditions = {
    priority: { $in: ["HIGH", "URGENT"] },
    status: { $ne: "COMPLETED" },
  };

  const serviceRequests = await ServiceRequests.find(filterConditions)
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation emergencyContact",
    )
    .populate(
      "propertyId",
      "name description address amenities totalLots availableLots isActive images rules",
    )
    .populate(
      "spotId",
      "spotNumber status size amenities hookups price description images isActive",
    )
    .sort({ priority: -1, requestedDate: -1 })
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

// Get service request dashboard statistics (Admin only)
const getServiceRequestDashboardStats = async () => {
  const totalRequests = await ServiceRequests.countDocuments();
  const pendingRequests = await ServiceRequests.countDocuments({
    status: "PENDING",
  });
  const inProgressRequests = await ServiceRequests.countDocuments({
    status: "IN_PROGRESS",
  });
  const completedRequests = await ServiceRequests.countDocuments({
    status: "COMPLETED",
  });
  const urgentRequests = await ServiceRequests.countDocuments({
    priority: "URGENT",
    status: { $ne: "COMPLETED" },
  });

  return {
    total: totalRequests,
    pending: pendingRequests,
    inProgress: inProgressRequests,
    completed: completedRequests,
    urgent: urgentRequests,
  };
};

// Admin User Management Services
const getAllUsers = async (adminId: string): Promise<IUser[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view all users",
    );
  }

  const users = await Users.find({})
    .select("-password")
    .sort({ createdAt: -1 });
  return users;
};

const getUserById = async (userId: string, adminId: string): Promise<IUser> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format");
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view user details",
    );
  }

  const user = await Users.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const updateUser = async (
  userId: string,
  updateData: IAdminUpdateUser,
  adminId: string,
): Promise<IUser> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format");
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can update user information",
    );
  }

  // Prevent admin from updating themselves through this endpoint
  if (userId === adminId) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Cannot update your own account through this endpoint",
    );
  }

  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check for phone number uniqueness if being updated
  if (updateData.phoneNumber && updateData.phoneNumber !== user.phoneNumber) {
    const existingUser = await Users.findOne({
      phoneNumber: updateData.phoneNumber,
    });
    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, "Phone number already exists");
    }
  }

  const updatedUser = await Users.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!updatedUser) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update user",
    );
  }

  return updatedUser;
};

const deleteUser = async (
  userId: string,
  adminId: string,
): Promise<{ message: string }> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format");
  }

  // Prevent admin from deleting themselves
  if (userId === adminId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Cannot delete your own account");
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can delete users",
    );
  }

  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Check if user has active property or spot assignments
  if (user.propertyId || user.spotId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete user with active property or spot assignments. Please remove assignments first.",
    );
  }

  await Users.findByIdAndDelete(userId);

  return {
    message: "User deleted successfully",
  };
};

export const AdminService = {
  inviteTenant,
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  createSpot,
  getSpotsByProperty,
  getSpotById,
  updateSpot,
  deleteSpot,
  getAllTenants,
  getAllServiceRequests,
  getServiceRequestById,
  updateServiceRequest,
  addAdminComment,
  getServiceRequestsByProperty,
  getServiceRequestsByTenant,
  getUrgentServiceRequests,
  getServiceRequestDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
