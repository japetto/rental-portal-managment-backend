import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ILease } from "./leases.interface";
import { LeasesService } from "./leases.service";

// Helper function to format lease data based on user role
const formatLeaseData = (lease: ILease, userRole?: string) => {
  const leaseData = lease.toObject();

  if (userRole === "SUPER_ADMIN") {
    // Admin sees both base rent and additional rent separately
    return {
      ...leaseData,
      rentAmount: leaseData.rentAmount,
      additionalRentAmount: leaseData.additionalRentAmount || 0,
      totalRentAmount: leaseData.totalRentAmount,
    };
  } else {
    // Tenant sees only the total rent amount (combined)
    return {
      ...leaseData,
      rentAmount: leaseData.totalRentAmount, // Show total as main rent amount
      additionalRentAmount: undefined, // Hide additional rent details from tenant
      totalRentAmount: leaseData.totalRentAmount,
    };
  }
};

// Helper function to format lease array data based on user role
const formatLeaseArrayData = (leases: ILease[], userRole?: string) => {
  return leases.map(lease => formatLeaseData(lease, userRole));
};

const createLease = catchAsync(async (req: Request, res: Response) => {
  const result = await LeasesService.createLease(req.body);
  const formattedResult = formatLeaseData(result, req.user?.role);

  sendResponse<ILease>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease created successfully",
    data: formattedResult as ILease,
  });
});

const getAllLeases = catchAsync(async (req: Request, res: Response) => {
  const filters = req.query;
  const paginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  };

  const result = await LeasesService.getAllLeases(filters, paginationOptions);
  const formattedData = formatLeaseArrayData(result.data, req.user?.role);

  res.status(httpStatus.OK).json({
    success: true,
    statusCode: httpStatus.OK,
    message: "Leases retrieved successfully",
    meta: result.meta,
    data: formattedData,
  });
});

const getLeaseById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeasesService.getLeaseById(id);
  const formattedResult = formatLeaseData(result!, req.user?.role);

  sendResponse<ILease>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease retrieved successfully",
    data: formattedResult as ILease,
  });
});

const getLeasesByTenant = catchAsync(async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const filters = {
    leaseStatus: req.query.status as any,
    leaseType: req.query.leaseType as any,
  };
  const paginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  };

  const result = await LeasesService.getLeasesByTenant(
    tenantId,
    filters,
    paginationOptions,
  );
  const formattedData = formatLeaseArrayData(result.data, req.user?.role);

  res.status(httpStatus.OK).json({
    success: true,
    statusCode: httpStatus.OK,
    message: "Tenant leases retrieved successfully",
    meta: result.meta,
    data: formattedData,
  });
});

const updateLease = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeasesService.updateLease(id, req.body);
  const formattedResult = formatLeaseData(result!, req.user?.role);

  sendResponse<ILease>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease updated successfully",
    data: formattedResult as ILease,
  });
});

const deleteLease = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeasesService.deleteLease(id);
  const formattedResult = formatLeaseData(result!, req.user?.role);

  sendResponse<ILease>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease deleted successfully",
    data: formattedResult as ILease,
  });
});

const getActiveLeasesByProperty = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const result = await LeasesService.getActiveLeasesByProperty(propertyId);
    const formattedData = formatLeaseArrayData(result, req.user?.role);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Active leases retrieved successfully",
      data: formattedData,
    });
  },
);

const getLeaseStatistics = catchAsync(async (req: Request, res: Response) => {
  const { propertyId } = req.query;
  const result = await LeasesService.getLeaseStatistics(propertyId as string);

  // Format statistics based on user role
  const formattedStats =
    req.user?.role === "SUPER_ADMIN"
      ? {
          ...result,
          // Admin sees detailed breakdown
          totalBaseRent: result.totalBaseRent,
          totalAdditionalRent: result.totalAdditionalRent,
          totalRent: result.totalRent,
        }
      : {
          ...result,
          // Tenant sees only total rent
          totalRent: result.totalRent,
          totalBaseRent: undefined,
          totalAdditionalRent: undefined,
        };

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease statistics retrieved successfully",
    data: formattedStats,
  });
});

export const LeasesController = {
  createLease,
  getAllLeases,
  getLeaseById,
  getLeasesByTenant,
  updateLease,
  deleteLease,
  getActiveLeasesByProperty,
  getLeaseStatistics,
};
