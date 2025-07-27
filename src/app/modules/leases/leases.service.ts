import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { calculatePaginationFunction } from "../../../helpers/paginationHelpers";
import { IPaginationOptions } from "../../../interface/pagination";
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

  const lease = await Leases.create({
    ...leaseData,
    leaseStatus,
    paymentStatus: "PENDING",
  });

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

const updateLease = async (
  id: string,
  updateData: IUpdateLease,
): Promise<ILease | null> => {
  const lease = await Leases.findOne({ _id: id, isDeleted: false });

  if (!lease) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lease not found");
  }

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
        totalRent: { $sum: "$rentAmount" },
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
