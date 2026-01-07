import httpStatus from "http-status";
import { Types } from "mongoose";
import config from "../../../config/config";
import ApiError from "../../../errors/ApiError";
import { calculatePaginationFunction } from "../../../helpers/paginationHelpers";
import { IPaginationOptions } from "../../../interface/pagination";
import { sendLeaseReadyNotification } from "../../../shared/emailService";
import { LeaseStatus, LeaseType } from "../../../shared/enums/payment.enums";
import { ICreateLease, ILease, IUpdateLease } from "./leases.interface";
import { Leases } from "./leases.schema";

const createLease = async (leaseData: ICreateLease): Promise<ILease> => {
  // Validate lease type and end date logic
  if (leaseData.leaseType === "FIXED_TERM" && !leaseData.leaseEnd) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Lease end date is required for FIXED_TERM leases",
    );
  }

  if (leaseData.leaseType === "MONTHLY" && leaseData.leaseEnd) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Lease end date should not be provided for MONTHLY leases",
    );
  }

  // Validate pet details if hasPets is true
  if (
    leaseData.pets.hasPets &&
    (!leaseData.pets.petDetails || leaseData.pets.petDetails.length === 0)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Pet details are required when hasPets is true",
    );
  }

  // Set default lease status based on start date
  const now = new Date();
  const leaseStatus: LeaseStatus =
    leaseData.leaseStart <= now ? LeaseStatus.ACTIVE : LeaseStatus.PENDING;

  // Ensure additionalRentAmount defaults to 0 if not provided
  const leaseDataWithDefaults = {
    ...leaseData,
    additionalRentAmount: leaseData.additionalRentAmount || 0,
    leaseStatus,
    paymentStatus: "PENDING",
  };

  const lease = await Leases.create(leaseDataWithDefaults);

  return lease;
};

const getAllLeases = async (
  filters: {
    searchTerm?: string;
    leaseType?: LeaseType;
    leaseStatus?: LeaseStatus;
    propertyId?: string;
    tenantId?: string;
  },
  paginationOptions: IPaginationOptions,
) => {
  const {
    searchTerm,
    leaseType,
    leaseStatus,
    propertyId,
    tenantId,
    ...filtersData
  } = filters;

  const andConditions: any[] = [
    { isDeleted: false }, // Only get non-deleted leases
  ];

  if (searchTerm) {
    andConditions.push({
      $or: [
        {
          "rvInfo.make": {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          "rvInfo.model": {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          "rvInfo.licensePlate": {
            $regex: searchTerm,
            $options: "i",
          },
        },
      ],
    });
  }

  if (leaseType) {
    andConditions.push({
      leaseType: leaseType,
    });
  }

  if (leaseStatus) {
    andConditions.push({
      leaseStatus: leaseStatus,
    });
  }

  if (propertyId) {
    andConditions.push({
      propertyId: new Types.ObjectId(propertyId),
    });
  }

  if (tenantId) {
    andConditions.push({
      tenantId: new Types.ObjectId(tenantId),
    });
  }

  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const { page, limit, skip, sortBy, sortOrder } =
    calculatePaginationFunction(paginationOptions);

  const sortConditions: { [key: string]: 1 | -1 } = {};

  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;
  }

  const result = await Leases.find(whereConditions)
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation",
    )
    .populate("spotId", "spotNumber spotType")
    .populate("propertyId", "name address")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Leases.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getLeaseById = async (id: string): Promise<ILease | null> => {
  const lease = await Leases.findOne({ _id: id, isDeleted: false })
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation",
    )
    .populate("spotId", "spotNumber spotType")
    .populate("propertyId", "name address");

  if (!lease) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lease not found");
  }

  return lease;
};

const getLeasesByTenant = async (
  tenantId: string,
  filters: {
    leaseStatus?: LeaseStatus;
    leaseType?: LeaseType;
  },
  paginationOptions: IPaginationOptions,
) => {
  const { leaseStatus, leaseType, ...filtersData } = filters;

  const andConditions: any[] = [
    { isDeleted: false }, // Only get non-deleted leases
  ];
  andConditions.push({ tenantId: new Types.ObjectId(tenantId) });
  if (leaseStatus) {
    andConditions.push({ leaseStatus });
  }
  if (leaseType) {
    andConditions.push({ leaseType });
  }
  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  let whereConditions: any = {};
  if (andConditions.length === 1) {
    whereConditions = andConditions[0];
  } else if (andConditions.length > 1) {
    whereConditions = { $and: andConditions };
  }

  const { page, limit, skip, sortBy, sortOrder } =
    calculatePaginationFunction(paginationOptions);

  const sortConditions: { [key: string]: 1 | -1 } = {};

  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;
  }

  const result = await Leases.find(whereConditions)
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation",
    )
    .populate("spotId", "spotNumber spotType")
    .populate("propertyId", "name address")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Leases.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// Helper function to check if lease is complete
const isLeaseComplete = (lease: any): boolean => {
  // Check if all required fields are filled
  const hasRequiredFields =
    lease.tenantId &&
    lease.spotId &&
    lease.propertyId &&
    lease.leaseType &&
    lease.leaseStart &&
    lease.occupants;

  // Check that depositAmount is provided and valid (required)
  const hasValidDepositAmount =
    typeof lease.depositAmount === "number" && lease.depositAmount >= 0;

  // Check lease type specific requirements
  const hasValidLeaseType =
    (lease.leaseType === LeaseType.FIXED_TERM && lease.leaseEnd) ||
    (lease.leaseType === LeaseType.MONTHLY && !lease.leaseEnd);

  // Check pet information if pets are present
  const hasValidPetInfo =
    !lease.pets.hasPets ||
    (lease.pets.hasPets &&
      lease.pets.petDetails &&
      lease.pets.petDetails.length > 0);

  // Check that additional rent amount is valid (optional - only validate if provided)
  const hasValidAdditionalRent =
    lease.additionalRentAmount === undefined ||
    lease.additionalRentAmount === null ||
    lease.additionalRentAmount >= 0;

  // Check that leaseAgreement is provided (required)
  const hasLeaseAgreement =
    !!lease.leaseAgreement && lease.leaseAgreement.trim() !== "";

  return (
    hasRequiredFields &&
    hasValidLeaseType &&
    hasValidPetInfo &&
    hasValidAdditionalRent &&
    hasLeaseAgreement &&
    hasValidDepositAmount
  );
};

// Helper function to check and send lease ready notification
export const checkAndSendLeaseReadyNotification = async (
  leaseId: string,
  previousLease?: any,
): Promise<void> => {
  console.log(`🔔 Starting lease notification check for lease ${leaseId}`);

  try {
    const { Leases } = await import("./leases.schema");

    // Populate the lease with tenant, property, and spot information
    const populatedLease = await Leases.findById(leaseId)
      .populate(
        "tenantId",
        "name email phoneNumber profileImage bio preferredLocation",
      )
      .populate("spotId", "spotNumber spotType spotIdentifier")
      .populate("propertyId", "name address");

    if (!populatedLease) {
      console.warn(`⚠️ Lease ${leaseId} not found for notification check`);
      return;
    }

    // Safely extract values to avoid circular reference issues
    const tenantEmail = populatedLease.tenantId
      ? (populatedLease.tenantId as any)?.email || "N/A"
      : "N/A";
    const propertyName = populatedLease.propertyId
      ? (populatedLease.propertyId as any)?.name || "N/A"
      : "N/A";
    const spotNumber = populatedLease.spotId
      ? (populatedLease.spotId as any)?.spotNumber ||
        (populatedLease.spotId as any)?.spotIdentifier ||
        "N/A"
      : "N/A";

    console.log(`📋 Lease found: ${leaseId}`);
    console.log(`   - Tenant: ${tenantEmail}`);
    console.log(`   - Property: ${propertyName}`);
    console.log(`   - Spot: ${spotNumber}`);
    console.log(
      `   - Lease Agreement: ${populatedLease.leaseAgreement ? "Present" : "Missing"}`,
    );
    console.log(`   - Deposit Amount: ${populatedLease.depositAmount || 0}`);
    console.log(`   - Lease Type: ${populatedLease.leaseType || "N/A"}`);
    console.log(
      `   - Lease End: ${populatedLease.leaseEnd ? populatedLease.leaseEnd.toISOString() : "N/A"}`,
    );

    // Check if lease is complete
    const isComplete = isLeaseComplete(populatedLease);
    console.log(`   - Is Complete: ${isComplete}`);

    // Only send notification if:
    // 1. Lease is now complete AND
    // 2. It wasn't complete before (or it's a new lease)
    const wasCompleteBefore = previousLease
      ? isLeaseComplete(previousLease)
      : false;
    console.log(`   - Was Complete Before: ${wasCompleteBefore}`);

    if (isComplete && !wasCompleteBefore) {
      const tenant = populatedLease.tenantId as any;
      const property = populatedLease.propertyId as any;
      const spot = populatedLease.spotId as any;

      console.log(`📧 Preparing to send notification...`);
      console.log(`   - Tenant Email: ${tenant?.email || "Missing"}`);
      console.log(`   - Tenant Name: ${tenant?.name || "Missing"}`);
      console.log(`   - Property Name: ${property?.name || "Missing"}`);
      console.log(
        `   - Spot Number: ${spot?.spotNumber || spot?.spotIdentifier || "Missing"}`,
      );

      // Only send notification if we have all required information
      if (
        tenant?.email &&
        tenant?.name &&
        property?.name &&
        (spot?.spotNumber || spot?.spotIdentifier)
      ) {
        const dashboardUrl = `${config.client_url}/my-info`;
        const spotNumber = spot.spotNumber || spot.spotIdentifier || "N/A";

        console.log(`📤 Sending email to ${tenant.email}...`);

        await sendLeaseReadyNotification(
          tenant.email,
          tenant.name,
          property.name,
          spotNumber,
          dashboardUrl,
        );

        console.log(
          `✅ Lease ready notification sent successfully to tenant ${tenant.email} for lease ${leaseId}`,
        );
      } else {
        console.warn(
          `⚠️ Cannot send lease ready notification: missing required information for lease ${leaseId}`,
        );
        console.warn(
          `   Missing: ${!tenant?.email ? "email, " : ""}${!tenant?.name ? "name, " : ""}${!property?.name ? "property name, " : ""}${!spot?.spotNumber && !spot?.spotIdentifier ? "spot number" : ""}`,
        );
      }
    } else if (!isComplete) {
      console.log(
        `ℹ️ Lease ${leaseId} is not complete yet. Missing required fields.`,
      );
    } else if (wasCompleteBefore) {
      console.log(
        `ℹ️ Lease ${leaseId} was already complete. Notification not sent to avoid duplicates.`,
      );
    }
  } catch (error) {
    // Log error but don't fail the lease update if email fails
    console.error(
      `❌ Error checking/sending lease ready notification for lease ${leaseId}:`,
      error,
    );
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`);
      console.error(`   Error stack: ${error.stack}`);
    }
  }
};

const updateLease = async (
  id: string,
  updateData: IUpdateLease,
): Promise<ILease | null> => {
  const lease = await Leases.findOne({ _id: id, isDeleted: false });

  if (!lease) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lease not found");
  }

  // Store previous lease state to check if it was complete before
  const previousLease = lease.toObject();

  // Validate lease type and end date logic for updates
  if (
    updateData.leaseType === "FIXED_TERM" &&
    !updateData.leaseEnd &&
    !lease.leaseEnd
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Lease end date is required for FIXED_TERM leases",
    );
  }

  if (updateData.leaseType === "MONTHLY" && updateData.leaseEnd) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Lease end date should not be provided for MONTHLY leases",
    );
  }

  // Validate pet details if hasPets is being updated to true
  if (
    updateData.pets?.hasPets &&
    (!updateData.pets.petDetails || updateData.pets.petDetails.length === 0)
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Pet details are required when hasPets is true",
    );
  }

  // Update lease status based on dates if leaseStart or leaseEnd is being updated
  if (updateData.leaseStart || updateData.leaseEnd) {
    const startDate = updateData.leaseStart || lease.leaseStart;
    const endDate = updateData.leaseEnd || lease.leaseEnd;
    const now = new Date();

    if (startDate <= now && (!endDate || endDate >= now)) {
      updateData.leaseStatus = LeaseStatus.ACTIVE;
    } else if (endDate && endDate < now) {
      updateData.leaseStatus = LeaseStatus.EXPIRED;
    } else if (startDate > now) {
      updateData.leaseStatus = LeaseStatus.PENDING;
    }
  }

  const updatedLease = await Leases.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate(
      "tenantId",
      "name email phoneNumber profileImage bio preferredLocation",
    )
    .populate("spotId", "spotNumber spotType")
    .populate("propertyId", "name address");

  // Check if lease is complete and send notification (only if it became complete)
  if (updatedLease) {
    // Check notification asynchronously to avoid blocking
    checkAndSendLeaseReadyNotification(id, previousLease).catch(error => {
      console.error(`Error in notification check for lease ${id}:`, error);
    });
  }

  return updatedLease;
};

const deleteLease = async (id: string): Promise<ILease | null> => {
  const lease = await Leases.findOne({ _id: id, isDeleted: false });

  if (!lease) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lease not found");
  }

  // Soft delete the lease
  const deletedLease = await Leases.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,
    },
    { new: true },
  );

  return deletedLease;
};

const getActiveLeasesByProperty = async (propertyId: string) => {
  const activeLeases = await Leases.find({
    propertyId: new Types.ObjectId(propertyId),
    leaseStatus: "ACTIVE",
    isDeleted: false,
  })
    .populate("tenantId", "name email phoneNumber")
    .populate("spotId", "spotNumber spotType");

  return activeLeases;
};

const getLeaseStatistics = async (propertyId?: string) => {
  const matchCondition = propertyId
    ? { propertyId: new Types.ObjectId(propertyId), isDeleted: false }
    : { isDeleted: false };

  const stats = await Leases.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalLeases: { $sum: 1 },
        activeLeases: {
          $sum: { $cond: [{ $eq: ["$leaseStatus", "ACTIVE"] }, 1, 0] },
        },
        pendingLeases: {
          $sum: { $cond: [{ $eq: ["$leaseStatus", "PENDING"] }, 1, 0] },
        },
        expiredLeases: {
          $sum: { $cond: [{ $eq: ["$leaseStatus", "EXPIRED"] }, 1, 0] },
        },
        monthlyLeases: {
          $sum: { $cond: [{ $eq: ["$leaseType", "MONTHLY"] }, 1, 0] },
        },
        fixedTermLeases: {
          $sum: { $cond: [{ $eq: ["$leaseType", "FIXED_TERM"] }, 1, 0] },
        },
        totalBaseRent: { $sum: "$rentAmount" },
        totalAdditionalRent: { $sum: "$additionalRentAmount" },
        totalRent: { $sum: { $add: ["$rentAmount", "$additionalRentAmount"] } },
        totalDeposits: { $sum: "$depositAmount" },
      },
    },
  ]);

  return (
    stats[0] || {
      totalLeases: 0,
      activeLeases: 0,
      pendingLeases: 0,
      expiredLeases: 0,
      monthlyLeases: 0,
      fixedTermLeases: 0,
      totalBaseRent: 0,
      totalAdditionalRent: 0,
      totalRent: 0,
      totalDeposits: 0,
    }
  );
};

export const LeasesService = {
  createLease,
  getAllLeases,
  getLeaseById,
  getLeasesByTenant,
  updateLease,
  deleteLease,
  getActiveLeasesByProperty,
  getLeaseStatistics,
};
