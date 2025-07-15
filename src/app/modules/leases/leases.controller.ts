import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ILease } from "./leases.interface";
import { LeasesService } from "./leases.service";

const createLease = catchAsync(async (req: Request, res: Response) => {
  const result = await LeasesService.createLease(req.body);
  sendResponse<ILease>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease created successfully",
    data: result,
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
  res.status(httpStatus.OK).json({
    success: true,
    statusCode: httpStatus.OK,
    message: "Leases retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getLeaseById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeasesService.getLeaseById(id);
  sendResponse<ILease>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease retrieved successfully",
    data: result!,
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
  res.status(httpStatus.OK).json({
    success: true,
    statusCode: httpStatus.OK,
    message: "Tenant leases retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateLease = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeasesService.updateLease(id, req.body);
  sendResponse<ILease>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease updated successfully",
    data: result!,
  });
});

const deleteLease = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeasesService.deleteLease(id);
  sendResponse<ILease>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease deleted successfully",
    data: result!,
  });
});

const getActiveLeasesByProperty = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const result = await LeasesService.getActiveLeasesByProperty(propertyId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Active leases retrieved successfully",
      data: result,
    });
  },
);

const getLeaseStatistics = catchAsync(async (req: Request, res: Response) => {
  const { propertyId } = req.query;
  const result = await LeasesService.getLeaseStatistics(propertyId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lease statistics retrieved successfully",
    data: result,
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
