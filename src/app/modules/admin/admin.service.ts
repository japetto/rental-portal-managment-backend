import httpStatus from "http-status";
import mongoose from "mongoose";
import ApiError from "../../../errors/ApiError";
import { IProperty } from "../properties/properties.interface";
import { Properties } from "../properties/properties.schema";
import { ISpot } from "../spots/spots.interface";
import { Spots } from "../spots/spots.schema";
import { IUser } from "../users/users.interface";
import { Users } from "../users/users.schema";
import {
  ICreateProperty,
  ICreateSpot,
  IInviteTenant,
  IUpdateProperty,
  IUpdateSpot,
} from "./admin.interface";

const inviteTenant = async (inviteData: IInviteTenant): Promise<IUser> => {
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
      "Spot is already assigned to another tenant",
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

  return user;
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
};
