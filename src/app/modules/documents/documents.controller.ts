import { Request, Response } from "express";
import httpStatus from "http-status";
import { IPaginationOptions } from "../../../interface/pagination";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import {
  ICreateDocument,
  IDocumentFilters,
  IUpdateDocument,
} from "./documents.interface";
import { DocumentsService } from "./documents.service";

// Create a new document (Admin only)
const createDocument = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as ICreateDocument;
  const adminId = req.user?.id;

  if (!adminId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "Unauthorized access",
      data: null,
    });
  }

  const result = await DocumentsService.createDocument(payload, adminId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Document created successfully",
    data: result,
  });
});

// Get all documents with filtering and pagination (Admin only)
const getAllDocuments = catchAsync(async (req: Request, res: Response) => {
  const filters: IDocumentFilters = req.query;
  const paginationOptions: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  };

  const result = await DocumentsService.getAllDocuments(
    filters,
    paginationOptions,
  );

  res.status(httpStatus.OK).send({
    success: true,
    statusCode: httpStatus.OK,
    message: "Documents retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Get documents for a tenant's property (Tenants can access their property documents)
const getTenantDocuments = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.user?._id?.toString();

  if (!tenantId) {
    throw new Error("User ID not found in token");
  }

  const paginationOptions: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  };

  const result = await DocumentsService.getTenantDocuments(
    tenantId,
    paginationOptions,
  );

  res.status(httpStatus.OK).send({
    success: true,
    statusCode: httpStatus.OK,
    message: "Tenant property documents retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Get a single document by ID
const getDocumentById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await DocumentsService.getDocumentById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Document retrieved successfully",
    data: result,
  });
});

// Update a document (Admin only)
const updateDocument = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body as IUpdateDocument;
  const adminId = req.user?.id;

  if (!adminId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "Unauthorized access",
      data: null,
    });
  }

  const result = await DocumentsService.updateDocument(id, payload, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Document updated successfully",
    data: result,
  });
});

// Delete a document (Admin only)
const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id;

  if (!adminId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "Unauthorized access",
      data: null,
    });
  }

  const result = await DocumentsService.deleteDocument(id, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Document deleted successfully",
    data: result,
  });
});

// Get document statistics (Admin only)
const getDocumentStats = catchAsync(async (req: Request, res: Response) => {
  const { propertyId } = req.query;

  const result = await DocumentsService.getDocumentStats(
    propertyId as string | undefined,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Document statistics retrieved successfully",
    data: result,
  });
});

// Get document categories
const getDocumentCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DocumentsService.getDocumentCategories();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Document categories retrieved successfully",
      data: result,
    });
  },
);

// Get document tags
const getDocumentTags = catchAsync(async (req: Request, res: Response) => {
  const result = await DocumentsService.getDocumentTags();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Document tags retrieved successfully",
    data: result,
  });
});

export const DocumentsController = {
  createDocument,
  getAllDocuments,

  getTenantDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  getDocumentCategories,
  getDocumentTags,
};
