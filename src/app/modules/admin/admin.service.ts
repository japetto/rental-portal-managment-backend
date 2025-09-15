import httpStatus from "http-status";
import mongoose from "mongoose";
import ApiError from "../../../errors/ApiError";
import {
  getDeletedRecords,
  restoreRecord,
  softDelete,
} from "../../../shared/softDeleteUtils";
import { Leases } from "../leases/leases.schema";
import { PaymentService } from "../payments/payment.service";
import { Payments } from "../payments/payments.schema";
import { IProperty } from "../properties/properties.interface";
import { Properties } from "../properties/properties.schema";
import {
  addLotDataToProperties,
  addLotDataToProperty,
} from "../properties/properties.service";
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
    if (existingUser.isDeleted) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `A tenant with email "${inviteData.email}" was previously deleted. Please restore the existing account or use a different email address.`,
      );
    }
    if (!existingUser.isActive) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `A tenant with email "${inviteData.email}" exists but is currently deactivated. Please reactivate the existing account or use a different email address.`,
      );
    }
    throw new ApiError(
      httpStatus.CONFLICT,
      `A tenant with email "${inviteData.email}" already exists in the system. Please use a different email address or contact the existing tenant.`,
    );
  }

  // Check if user already exists with this phone number
  const existingUserByPhone = await Users.findOne({
    phoneNumber: inviteData.phoneNumber,
  });
  if (existingUserByPhone) {
    if (existingUserByPhone.isDeleted) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `A tenant with phone number "${inviteData.phoneNumber}" was previously deleted. Please restore the existing account or use a different phone number.`,
      );
    }
    if (!existingUserByPhone.isActive) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `A tenant with phone number "${inviteData.phoneNumber}" exists but is currently deactivated. Please reactivate the existing account or use a different phone number.`,
      );
    }
    throw new ApiError(
      httpStatus.CONFLICT,
      `A tenant with phone number "${inviteData.phoneNumber}" already exists in the system. Please use a different phone number or contact the existing tenant.`,
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

  // Create the user with tenant role and invitation status (no password - they'll set it via invitation link)
  const userData = {
    name: inviteData.name,
    email: inviteData.email,
    phoneNumber: inviteData.phoneNumber,
    password: "", // Empty password - tenant will set it via invitation link
    confirmPassword: "", // Empty confirmation password
    role: "TENANT" as const,
    isInvited: true,
    isVerified: false,
    preferredLocation: inviteData.preferredLocation || property.address.city, // Use provided location or default to property city
    propertyId: inviteData.propertyId,
    spotId: inviteData.spotId,
  };

  const user = await Users.create(userData);

  // Update spot status to RESERVED (reserved for the invited tenant)
  await Spots.findByIdAndUpdate(inviteData.spotId, { status: "RESERVED" });

  // Property lots are now calculated from spots, no need to update manually

  const propertyWithLotData = await addLotDataToProperty(property);

  return {
    user,
    property: propertyWithLotData,
    spot,
  };
};

const createProperty = async (
  propertyData: ICreateProperty,
): Promise<IProperty> => {
  try {
    // Check if property with same name already exists (including soft-deleted ones)
    const existingPropertyByName = await Properties.findOne({
      name: propertyData.name,
    });

    if (existingPropertyByName) {
      if (existingPropertyByName.isDeleted) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `A property with the name "${propertyData.name}" was previously deleted. Please use a different name or restore the existing property.`,
        );
      } else {
        throw new ApiError(
          httpStatus.CONFLICT,
          `A property with the name "${propertyData.name}" already exists. Please choose a different name.`,
        );
      }
    }

    // Create the property
    const property = await Properties.create(propertyData);

    // Auto-assign default Stripe account to the new property
    try {
      const { autoAssignPropertyToDefaultAccount } = await import(
        "../stripe/stripe.service"
      );
      await autoAssignPropertyToDefaultAccount(
        (property as any)._id.toString(),
      );
    } catch (stripeError) {
      // Log the error but don't fail the property creation
      console.error(
        "Failed to auto-assign default Stripe account:",
        stripeError,
      );
      // You might want to add this to a queue for retry later
    }

    return property;
  } catch (error: any) {
    // Handle MongoDB duplicate key errors specifically
    if (error.code === 11000) {
      if (error.keyPattern?.propertyName) {
        throw new ApiError(
          httpStatus.CONFLICT,
          "A property with this name already exists. Please choose a different name.",
        );
      } else if (error.keyPattern?.name) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `A property with the name "${propertyData.name}" already exists. Please choose a different name.`,
        );
      }
    }
    throw error;
  }
};

// Helper function to calculate income for a property
const calculatePropertyIncome = async (propertyId: string) => {
  const { Leases } = await import("../leases/leases.schema");
  const { Spots } = await import("../spots/spots.schema");

  // Calculate total current active income (sum of all active leases' total rent amounts)
  const activeLeases = await Leases.find({
    propertyId: propertyId,
    leaseStatus: "ACTIVE",
    isDeleted: false,
  });

  const totalCurrentActiveIncome = activeLeases.reduce((sum, lease) => {
    return sum + (lease.rentAmount + (lease.additionalRentAmount || 0));
  }, 0);

  // Calculate total max income (sum of all spots' monthly prices)
  const allSpots = await Spots.find({
    propertyId: propertyId,
    isDeleted: false,
  });

  const totalMaxIncome = allSpots.reduce((sum, spot) => {
    return sum + (spot.price.monthly || 0);
  }, 0);

  return {
    totalCurrentActiveIncome,
    totalMaxIncome,
  };
};

const getAllProperties = async (): Promise<IProperty[]> => {
  const properties = await Properties.find({ isDeleted: false }).sort({
    createdAt: -1,
  });
  const propertiesWithLotData = await addLotDataToProperties(properties);

  // Add income calculations for each property
  const propertiesWithIncome = await Promise.all(
    propertiesWithLotData.map(async property => {
      const { totalCurrentActiveIncome, totalMaxIncome } =
        await calculatePropertyIncome(property._id);

      return {
        ...property,
        totalCurrentActiveIncome,
        totalMaxIncome,
      };
    }),
  );

  return propertiesWithIncome;
};

const getPropertyById = async (propertyId: string): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  const property = await Properties.findOne({
    _id: propertyId,
    isDeleted: false,
  });
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  const propertyWithLotData = await addLotDataToProperty(property);

  // Add income calculations for the property
  const { totalCurrentActiveIncome, totalMaxIncome } =
    await calculatePropertyIncome(propertyId);

  return {
    ...propertyWithLotData,
    totalCurrentActiveIncome,
    totalMaxIncome,
  } as IProperty;
};

const updateProperty = async (
  propertyId: string,
  updateData: IUpdateProperty,
): Promise<IProperty> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
    }

    const property = await Properties.findOne({
      _id: propertyId,
      isDeleted: false,
    });
    if (!property) {
      throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
    }

    // Check if the new name conflicts with existing properties
    if (updateData.name) {
      const existingProperty = await Properties.findOne({
        name: updateData.name,
        _id: { $ne: propertyId }, // Exclude current property
      });

      if (existingProperty) {
        if (existingProperty.isDeleted) {
          throw new ApiError(
            httpStatus.CONFLICT,
            `A property with the name "${updateData.name}" was previously deleted. Please use a different name or restore the existing property.`,
          );
        } else {
          throw new ApiError(
            httpStatus.CONFLICT,
            `A property with the name "${updateData.name}" already exists. Please choose a different name.`,
          );
        }
      }
    }

    const updatedProperty = await Properties.findByIdAndUpdate(
      propertyId,
      updateData,
      { new: true, runValidators: true },
    );

    const propertyWithLotData = await addLotDataToProperty(updatedProperty!);
    return propertyWithLotData;
  } catch (error: any) {
    // Handle MongoDB duplicate key errors specifically
    if (error.code === 11000) {
      if (error.keyPattern?.propertyName) {
        throw new ApiError(
          httpStatus.CONFLICT,
          "A property with this name already exists. Please choose a different name.",
        );
      } else if (error.keyPattern?.name) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `A property with the name "${updateData.name}" already exists. Please choose a different name.`,
        );
      }
    }
    throw error;
  }
};

const deleteProperty = async (propertyId: string): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  const property = await Properties.findOne({
    _id: propertyId,
    isDeleted: false,
  });
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  // Check if property has any active tenants
  const activeTenantsCount = await Users.countDocuments({
    propertyId,
    isDeleted: false,
  });
  if (activeTenantsCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete property with existing active tenants",
    );
  }

  // Check if property has any active spots
  const activeSpotsCount = await Spots.countDocuments({
    propertyId,
    isDeleted: false,
  });
  if (activeSpotsCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot delete property with existing active spots",
    );
  }

  await softDelete(Properties, propertyId);
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

  // Property is always active now (no isActive field)

  // Check if spot number already exists in this property
  const existingSpotByNumber = await Spots.findOne({
    propertyId: spotData.propertyId,
    spotNumber: spotData.spotNumber,
  });
  if (existingSpotByNumber) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Spot number already exists in this property",
    );
  }

  // Check if lot identifier already exists in this property
  const existingSpotByIdentifier = await Spots.findOne({
    propertyId: spotData.propertyId,
    lotIdentifier: spotData.lotIdentifier,
  });
  if (existingSpotByIdentifier) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Spot identifier already exists in this property",
    );
  }

  // Validate status - only AVAILABLE and MAINTENANCE are allowed
  if (
    spotData.status &&
    !["AVAILABLE", "MAINTENANCE"].includes(spotData.status)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid status. Only AVAILABLE and MAINTENANCE are allowed for spot creation",
    );
  }

  // Validate that at least one price is provided
  if (
    !spotData.price.daily &&
    !spotData.price.weekly &&
    !spotData.price.monthly
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one price (daily, weekly, or monthly) must be provided",
    );
  }

  // No limit on spots - they are managed independently

  // Create the spot with validated data
  const spot = await Spots.create({
    ...spotData,
    status: spotData.status || "AVAILABLE", // Default to AVAILABLE if not specified
    isActive: true,
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
  const property = await Properties.findOne({
    _id: propertyId,
    isDeleted: false,
  });
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  // Build query
  const query: any = { propertyId, isDeleted: false };

  // Add status filter if provided
  if (status) {
    const validStatuses = ["AVAILABLE", "MAINTENANCE", "RESERVED", "BOOKED"];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid status. Must be one of: AVAILABLE, MAINTENANCE, RESERVED, BOOKED",
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

  const spot = await Spots.findOne({ _id: spotId, isDeleted: false });
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

  const spot = await Spots.findOne({ _id: spotId, isDeleted: false });
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found");
  }

  // If updating spot number, check for uniqueness within the property
  if (updateData.spotNumber && updateData.spotNumber !== spot.spotNumber) {
    const existingSpotByNumber = await Spots.findOne({
      propertyId: spot.propertyId,
      spotNumber: updateData.spotNumber,
      _id: { $ne: spotId },
    });
    if (existingSpotByNumber) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Spot number already exists in this property",
      );
    }
  }

  // If updating lot identifier, check for uniqueness within the property
  if (
    updateData.lotIdentifier &&
    updateData.lotIdentifier !== spot.lotIdentifier
  ) {
    const existingSpotByIdentifier = await Spots.findOne({
      propertyId: spot.propertyId,
      lotIdentifier: updateData.lotIdentifier,
      _id: { $ne: spotId },
    });
    if (existingSpotByIdentifier) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Spot identifier already exists in this property",
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

  const spot = await Spots.findOne({ _id: spotId, isDeleted: false });
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found");
  }

  // Check if spot is assigned to an active tenant (reserved/booked)
  const assignedTenant = await Users.findOne({
    spotId,
    isDeleted: false,
  });
  if (assignedTenant) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete a spot that is assigned to tenant: ${assignedTenant.name}`,
    );
  }

  await softDelete(Spots, spotId);

  // Update property's available lots count
  await Properties.findByIdAndUpdate(spot.propertyId, {
    $inc: { availableLots: -1 },
  });
};

const getAllTenants = async (): Promise<IUser[]> => {
  const tenants = await Users.find({ role: "TENANT", isDeleted: false })
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber status size price description")
    .populate(
      "leaseId",
      "leaseType leaseStart leaseEnd rentAmount additionalRentAmount depositAmount leaseStatus occupants pets specialRequests documents notes leaseAgreement",
    )
    .sort({ createdAt: -1 });

  if (tenants.length === 0) {
    return [];
  }

  // Transform the data to include lot number, lease info, and rent summary
  const tenantsWithLotNumber = await Promise.all(
    tenants.map(async tenant => {
      const tenantData = tenant.toObject() as any;

      // Check tenant status - simplified validation
      const isTenantDataComplete = (user: any, activeLease?: any): boolean => {
        // Check if user is a tenant
        if (user.role !== "TENANT") {
          return false;
        }

        // Check if tenant has an active lease
        if (!activeLease || activeLease.leaseStatus !== "ACTIVE") {
          return false;
        }

        // Simplified tenantStatus logic - only check lease-related fields
        const hasLeaseType = !!activeLease.leaseType;

        const hasLeaseDates = !!(
          activeLease.leaseStart &&
          (activeLease.leaseType === "MONTHLY" ||
            (activeLease.leaseType === "FIXED_TERM" && activeLease.leaseEnd))
        );

        const hasRentAmount =
          typeof activeLease.rentAmount === "number" &&
          activeLease.rentAmount > 0;

        const hasDepositAmount =
          typeof activeLease.depositAmount === "number" &&
          activeLease.depositAmount >= 0;

        const hasOccupants =
          typeof activeLease.occupants === "number" &&
          activeLease.occupants > 0;

        const hasLeaseAgreement =
          !!activeLease.leaseAgreement &&
          activeLease.leaseAgreement.trim() !== "";

        // ALL conditions must be met for tenant status to be true
        return (
          hasLeaseType &&
          hasLeaseDates &&
          hasRentAmount &&
          hasDepositAmount &&
          hasOccupants &&
          hasLeaseAgreement
        );
      };

      // Get active lease for tenant status check
      const activeLease = tenantData.leaseId;
      const tenantStatus = isTenantDataComplete(tenantData, activeLease);

      // Add tenant status to the response
      tenantData.tenantStatus = tenantStatus;

      // Add rent summary for each tenant using the existing service
      let rentSummary = null;
      if (activeLease && tenantStatus) {
        try {
          rentSummary = await PaymentService.getRentSummary(tenantData._id);
        } catch (error) {
          console.error(
            `Error getting rent summary for tenant ${tenantData.name}:`,
            error,
          );
          // Keep rentSummary as null if there's an error
        }
      }

      // Add rent summary to the response
      tenantData.rentSummary = rentSummary;

      // Add property info as a direct field for easier access
      if (tenantData.propertyId && typeof tenantData.propertyId === "object") {
        tenantData.property = {
          id: tenantData.propertyId._id,
          name: tenantData.propertyId.name,
          address: tenantData.propertyId.address,
        };
        // Remove the original propertyId to avoid duplication
        delete tenantData.propertyId;
      }

      // Add lot number as a direct field for easier access
      if (tenantData.spotId && typeof tenantData.spotId === "object") {
        tenantData.lotNumber = tenantData.spotId.spotNumber;
        tenantData.lotStatus = tenantData.spotId.status;
        tenantData.lotSize = tenantData.spotId.size;
        tenantData.lotPrice = tenantData.spotId.price;
        tenantData.lotDescription = tenantData.spotId.description;
        // Remove the original spotId to avoid duplication
        delete tenantData.spotId;
      }

      // Add lease info as a direct field for easier access
      if (tenantData.leaseId && typeof tenantData.leaseId === "object") {
        tenantData.lease = {
          id: tenantData.leaseId._id,
          leaseType: tenantData.leaseId.leaseType,
          leaseStart: tenantData.leaseId.leaseStart,
          leaseEnd: tenantData.leaseId.leaseEnd,
          rentAmount: tenantData.leaseId.rentAmount, // Base rent amount
          additionalRentAmount: tenantData.leaseId.additionalRentAmount || 0, // Additional rent amount
          totalRentAmount:
            (tenantData.leaseId.rentAmount || 0) +
            (tenantData.leaseId.additionalRentAmount || 0), // Total rent amount
          depositAmount: tenantData.leaseId.depositAmount,
          leaseStatus: tenantData.leaseId.leaseStatus,
          occupants: tenantData.leaseId.occupants,
          pets: tenantData.leaseId.pets,
          specialRequests: tenantData.leaseId.specialRequests,
          documents: tenantData.leaseId.documents,
          leaseAgreement: tenantData.leaseId.leaseAgreement, // Add lease agreement field
          notes: tenantData.leaseId.notes,
        };
        // Remove the original leaseId to avoid duplication
        delete tenantData.leaseId;
      } else {
        tenantData.lease = null;
        // Remove the original leaseId to avoid duplication
        delete tenantData.leaseId;
      }

      return tenantData;
    }),
  );

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

  const serviceRequest = await ServiceRequests.findOne({
    _id: requestId,
    isDeleted: false,
  })
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
  const filterConditions: Record<string, unknown> = {
    propertyId,
    isDeleted: false,
  };

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
  const filterConditions: Record<string, unknown> = {
    tenantId,
    isDeleted: false,
  };

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
    isDeleted: false,
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
  const totalRequests = await ServiceRequests.countDocuments({
    isDeleted: false,
  });
  const pendingRequests = await ServiceRequests.countDocuments({
    status: "PENDING",
    isDeleted: false,
  });
  const inProgressRequests = await ServiceRequests.countDocuments({
    status: "IN_PROGRESS",
    isDeleted: false,
  });
  const completedRequests = await ServiceRequests.countDocuments({
    status: "COMPLETED",
    isDeleted: false,
  });
  const urgentRequests = await ServiceRequests.countDocuments({
    priority: "URGENT",
    status: { $ne: "COMPLETED" },
    isDeleted: false,
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

  const users = await Users.find({ isDeleted: false })
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

  const user = await Users.findOne({ _id: userId, isDeleted: false })
    .select("-password")
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber status size price description")
    .populate(
      "leaseId",
      "leaseType leaseStart leaseEnd rentAmount additionalRentAmount depositAmount leaseStatus occupants pets specialRequests documents notes",
    );
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

  const user = await Users.findOne({ _id: userId, isDeleted: false });
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

  const user = await Users.findOne({ _id: userId, isDeleted: false });
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

// Archive and Restore Methods

// Archive a property (soft delete)
const archiveProperty = async (
  propertyId: string,
  adminId: string,
): Promise<{ message: string }> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can archive properties",
    );
  }

  const property = await Properties.findOne({
    _id: propertyId,
    isDeleted: false,
  });
  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found");
  }

  // Check if property has any active tenants
  const activeTenantsCount = await Users.countDocuments({
    propertyId,
    isDeleted: false,
  });
  if (activeTenantsCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot archive property with existing active tenants",
    );
  }

  // Check if property has any active spots
  const activeSpotsCount = await Spots.countDocuments({
    propertyId,
    isDeleted: false,
  });
  if (activeSpotsCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot archive property with existing active spots",
    );
  }

  await softDelete(Properties, propertyId, adminId);

  return {
    message: "Property archived successfully",
  };
};

// Restore a property
const restoreProperty = async (
  propertyId: string,
  adminId: string,
): Promise<{ message: string }> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid property ID format");
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can restore properties",
    );
  }

  const property = await Properties.findOne({
    _id: propertyId,
    isDeleted: true,
  });
  if (!property) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Property not found or not archived",
    );
  }

  await restoreRecord(Properties, propertyId, adminId);

  return {
    message: "Property restored successfully",
  };
};

// Archive a spot (soft delete)
const archiveSpot = async (
  spotId: string,
  adminId: string,
): Promise<{ message: string }> => {
  if (!mongoose.Types.ObjectId.isValid(spotId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid spot ID format");
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can archive spots",
    );
  }

  const spot = await Spots.findOne({ _id: spotId, isDeleted: false });
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found");
  }

  // Check if spot is assigned to an active tenant
  const assignedTenant = await Users.findOne({
    spotId,
    isDeleted: false,
  });
  if (assignedTenant) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot archive a spot that is assigned to tenant: ${assignedTenant.name}`,
    );
  }

  await softDelete(Spots, spotId, adminId);

  // Update property's available lots count
  await Properties.findByIdAndUpdate(spot.propertyId, {
    $inc: { availableLots: -1 },
  });

  return {
    message: "Spot archived successfully",
  };
};

// Restore a spot
const restoreSpot = async (
  spotId: string,
  adminId: string,
): Promise<{ message: string }> => {
  if (!mongoose.Types.ObjectId.isValid(spotId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid spot ID format");
  }

  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can restore spots",
    );
  }

  const spot = await Spots.findOne({ _id: spotId, isDeleted: true });
  if (!spot) {
    throw new ApiError(httpStatus.NOT_FOUND, "Spot not found or not archived");
  }

  await restoreRecord(Spots, spotId, adminId);

  // Update property's available lots count
  await Properties.findByIdAndUpdate(spot.propertyId, {
    $inc: { availableLots: 1 },
  });

  return {
    message: "Spot restored successfully",
  };
};

// Get archived properties
const getArchivedProperties = async (adminId: string): Promise<IProperty[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view archived properties",
    );
  }

  const archivedProperties = await getDeletedRecords(Properties);
  const propertiesWithLotData =
    await addLotDataToProperties(archivedProperties);
  return propertiesWithLotData;
};

// Get archived spots
const getArchivedSpots = async (adminId: string) => {
  const spots = await Spots.find({
    isDeleted: true,
  }).populate("propertyId", "name");

  return spots;
};

const createTestLease = async (leaseData: any) => {
  const { LeasesService } = await import("../leases/leases.service");
  return await LeasesService.createLease(leaseData);
};

// Remove lease agreement from a lease
const removeLeaseAgreement = async (
  leaseId: string,
  reason: string,
  adminId: string,
): Promise<{ message: string; lease: any }> => {
  if (!mongoose.Types.ObjectId.isValid(leaseId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid lease ID format");
  }

  // Check if admin exists and is authorized
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can remove lease agreements",
    );
  }

  // Import Leases schema
  const { Leases } = await import("../leases/leases.schema");

  // Find the lease
  const lease = await Leases.findOne({
    _id: leaseId,
    isDeleted: false,
  });

  if (!lease) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lease not found");
  }

  // Check if lease agreement exists
  if (!lease.leaseAgreement) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No lease agreement found to remove",
    );
  }

  // Remove the lease agreement and add admin note
  const updatedLease = await Leases.findByIdAndUpdate(
    leaseId,
    {
      $unset: { leaseAgreement: 1 }, // Remove the leaseAgreement field
      $set: {
        notes: lease.notes
          ? `${lease.notes}\n\n[${new Date().toISOString()}] Lease agreement removed by admin (${admin.name}). Reason: ${reason}`
          : `[${new Date().toISOString()}] Lease agreement removed by admin (${admin.name}). Reason: ${reason}`,
      },
    },
    { new: true, runValidators: true },
  );

  if (!updatedLease) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update lease",
    );
  }

  console.log(
    `🔧 Admin ${admin.name} removed lease agreement from lease ${leaseId}. Reason: ${reason}`,
  );

  return {
    message: "Lease agreement removed successfully",
    lease: updatedLease,
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
  archiveProperty,
  restoreProperty,
  archiveSpot,
  restoreSpot,
  getArchivedProperties,
  getArchivedSpots,
  createTestLease,
  getPayments,
  updatePayment,
  removeLeaseAgreement,
};

// Get all payments with filters/pagination (Admin)
async function getPayments(
  filters: Record<string, unknown>,
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || "createdAt";
  const sortOrder = options.sortOrder === "asc" ? 1 : -1;

  const query: Record<string, unknown> = { isDeleted: false };

  if (filters.status && typeof filters.status === "string") {
    query.status = filters.status;
  }
  if (filters.type && typeof filters.type === "string") {
    query.type = filters.type;
  }
  if (filters.propertyId && typeof filters.propertyId === "string") {
    query.propertyId = filters.propertyId;
  }
  if (filters.tenantId && typeof filters.tenantId === "string") {
    query.tenantId = filters.tenantId;
  }
  if (filters.spotId && typeof filters.spotId === "string") {
    query.spotId = filters.spotId;
  }
  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (typeof filters.startDate === "string") {
      dateFilter.$gte = new Date(filters.startDate);
    }
    if (typeof filters.endDate === "string") {
      dateFilter.$lte = new Date(filters.endDate);
    }
    query.createdAt = dateFilter;
  }

  const sortConditions: Record<string, 1 | -1> = {};
  sortConditions[sortBy] = sortOrder;

  const payments = await Payments.find(query)
    .populate("tenantId", "name email phoneNumber")
    .populate("propertyId", "name address")
    .populate("spotId", "spotNumber lotIdentifier")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Payments.countDocuments(query);

  // Transform results for admin UI convenience
  const data = payments.map(p => {
    const payment: any = p.toObject();
    return {
      id: payment._id,
      type: payment.type,
      status: payment.status,
      amount: payment.amount,
      lateFeeAmount: payment.lateFeeAmount || 0,
      totalAmount: payment.totalAmount,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate,
      receiptNumber: payment.receiptNumber,
      description: payment.description,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      tenant: payment.tenantId
        ? {
            id: payment.tenantId._id,
            name: payment.tenantId.name,
            email: payment.tenantId.email,
            phoneNumber: payment.tenantId.phoneNumber,
          }
        : null,
      property: payment.propertyId
        ? {
            id: payment.propertyId._id,
            name: payment.propertyId.name,
            address: payment.propertyId.address,
          }
        : null,
      spot: payment.spotId
        ? {
            id: payment.spotId._id,
            spotNumber: payment.spotId.spotNumber,
            lotIdentifier: payment.spotId.lotIdentifier,
          }
        : null,
      stripe: {
        paymentLinkId: payment.stripePaymentLinkId,
        paymentIntentId: payment.stripePaymentIntentId,
        transactionId: payment.stripeTransactionId,
      },
    };
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data,
  };
}

// Update payment manually (Admin) - Handles both updating existing and creating new payments
async function updatePayment(
  tenantId: string,
  updateData: {
    amount: number;
    paidDate: string;
    dueDate: string;
    description?: string;
    notes?: string;
    type?: string;
  },
  adminId: string,
) {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid tenant ID format");
  }

  // Validate payment date
  const paidDate = new Date(updateData.paidDate);
  if (isNaN(paidDate.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payment date format");
  }

  // Validate due date (now required)
  const dueDate = new Date(updateData.dueDate);
  if (isNaN(dueDate.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid due date format");
  }

  // Get tenant and lease information
  const tenant = await Users.findById(tenantId);
  if (!tenant || tenant.isDeleted || !tenant.isActive) {
    throw new ApiError(httpStatus.NOT_FOUND, "Tenant not found or inactive");
  }

  const activeLease = await Leases.findOne({
    tenantId: tenantId,
    leaseStatus: "ACTIVE",
    isDeleted: false,
  }).populate("propertyId spotId");

  if (!activeLease) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No active lease found for this tenant",
    );
  }

  // Try to find existing pending or overdue payment first
  let existingPayment = await Payments.findOne({
    tenantId: tenantId,
    status: { $in: ["PENDING", "OVERDUE"] },
    isDeleted: false,
  }).sort({ dueDate: 1 });

  let updatedPayment;

  if (existingPayment) {
    // Scenario 1: Update existing pending/overdue payment
    console.log("Updating existing payment:", existingPayment._id);

    const updateFields: any = {
      amount: updateData.amount,
      paidDate: paidDate,
      status: "PAID", // Mark as paid when manually updated
      paymentMethod: "MANUAL", // Mark as manual payment
      updatedAt: new Date(),
    };

    // Add optional fields if provided
    if (updateData.description) {
      updateFields.description = updateData.description;
    }

    if (updateData.notes) {
      updateFields.notes = updateData.notes;
    }

    // Update the existing payment
    updatedPayment = await Payments.findByIdAndUpdate(
      existingPayment._id,
      updateFields,
      { new: true, runValidators: true },
    ).populate([
      {
        path: "tenantId",
        select: "name email phoneNumber",
      },
      {
        path: "propertyId",
        select: "name address",
      },
      {
        path: "spotId",
        select: "spotNumber lotIdentifier",
      },
    ]);
  } else {
    // Scenario 2: Create new payment record
    console.log("Creating new payment for tenant:", tenantId);

    // Determine payment type
    const paymentType = updateData.type || "RENT";

    // Check if this is a first-time payment for description purposes
    const existingPayments = await Payments.find({
      tenantId: tenantId,
      type: "RENT",
      isDeleted: false,
    });
    const isFirstTimePayment = existingPayments.length === 0;

    // Debug logging for dates
    console.log("🔍 DEBUG - Date Information:");
    console.log("  - Lease Start Date:", activeLease.leaseStart);
    console.log("  - Lease End Date:", activeLease.leaseEnd);
    console.log("  - Payment Due Date:", dueDate);
    console.log("  - Payment Paid Date:", paidDate);
    console.log("  - Current Date:", new Date());
    console.log("  - Is First Time Payment:", isFirstTimePayment);

    // Generate receipt number
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const receiptNumber = `RCP-${timestamp}-${random}`;

    // isFirstTimePayment already determined above

    // Calculate pro-rated amount for first-time payments if needed
    let finalAmount = updateData.amount;
    let description = updateData.description;

    if (isFirstTimePayment && paymentType === "RENT" && !description) {
      const leaseStart = activeLease.leaseStart;
      const leaseStartDay = leaseStart.getDate();

      if (leaseStartDay > 1) {
        // Pro-rated first month calculation
        const daysInMonth = new Date(
          leaseStart.getFullYear(),
          leaseStart.getMonth() + 1,
          0,
        ).getDate();
        const remainingDays = daysInMonth - leaseStartDay + 1;
        const totalRentAmount =
          activeLease.rentAmount + (activeLease.additionalRentAmount || 0);
        const proRatedRent = Math.round(
          (totalRentAmount / daysInMonth) * remainingDays,
        );
        const expectedAmount = proRatedRent + activeLease.depositAmount;

        // If the provided amount matches the expected pro-rated amount, use pro-rated description
        if (Math.abs(updateData.amount - expectedAmount) < 1) {
          // Allow for small rounding differences
          description = `Pro-rated First Month Rent (${remainingDays} days) + Deposit`;
        } else {
          description = "First Month Rent + Deposit";
        }
      } else {
        // Full first month
        description = "First Month Rent + Deposit";
      }
    } else if (!description) {
      description = `Manual ${paymentType} Payment`;
    }

    // Create new payment record
    const newPaymentData = {
      tenantId: tenantId,
      propertyId: activeLease.propertyId._id,
      spotId: activeLease.spotId._id,
      amount: updateData.amount,
      type: paymentType,
      status: "PAID", // Mark as paid since it's a manual payment
      dueDate: dueDate,
      paidDate: paidDate,
      paymentMethod: "MANUAL",
      description: description,
      notes: updateData.notes,
      lateFeeAmount: 0,
      totalAmount: updateData.amount,
      receiptNumber: receiptNumber,
      createdBy: adminId,
      isActive: true,
      isDeleted: false,
    };

    // Create the new payment
    updatedPayment = await Payments.create(newPaymentData);

    // Populate the created payment
    updatedPayment = await Payments.findById(updatedPayment._id).populate([
      {
        path: "tenantId",
        select: "name email phoneNumber",
      },
      {
        path: "propertyId",
        select: "name address",
      },
      {
        path: "spotId",
        select: "spotNumber lotIdentifier",
      },
    ]);
  }

  if (!updatedPayment) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to process payment",
    );
  }

  // Update rent summary to reflect the latest payment data
  try {
    await PaymentService.getRentSummary(tenantId);
    console.log(`Rent summary updated for tenant: ${tenantId}`);
  } catch (error) {
    console.error(
      `Failed to update rent summary for tenant ${tenantId}:`,
      error,
    );
    // Don't throw error here as payment was successful, just log the issue
  }

  // Return the payment in the same format as getPayments
  const paymentData: any = updatedPayment.toObject();
  return {
    id: paymentData._id,
    type: paymentData.type,
    status: paymentData.status,
    amount: paymentData.amount,
    lateFeeAmount: paymentData.lateFeeAmount || 0,
    totalAmount: paymentData.totalAmount,
    dueDate: paymentData.dueDate,
    paidDate: paymentData.paidDate,
    receiptNumber: paymentData.receiptNumber,
    description: paymentData.description,
    notes: paymentData.notes,
    paymentMethod: paymentData.paymentMethod,
    createdAt: paymentData.createdAt,
    updatedAt: paymentData.updatedAt,
    tenant: paymentData.tenantId
      ? {
          id: paymentData.tenantId._id,
          name: paymentData.tenantId.name,
          email: paymentData.tenantId.email,
          phoneNumber: paymentData.tenantId.phoneNumber,
        }
      : null,
    property: paymentData.propertyId
      ? {
          id: paymentData.propertyId._id,
          name: paymentData.propertyId.name,
          address: paymentData.propertyId.address,
        }
      : null,
    spot: paymentData.spotId
      ? {
          id: paymentData.spotId._id,
          spotNumber: paymentData.spotId.spotNumber,
          lotIdentifier: paymentData.spotId.lotIdentifier,
        }
      : null,
    stripe: {
      paymentLinkId: paymentData.stripePaymentLinkId,
      paymentIntentId: paymentData.stripePaymentIntentId,
      transactionId: paymentData.stripeTransactionId,
    },
  };
}
