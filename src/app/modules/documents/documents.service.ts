import httpStatus from "http-status";
import mongoose from "mongoose";
import ApiError from "../../../errors/ApiError";
import { calculatePaginationFunction } from "../../../helpers/paginationHelpers";
import { IPaginationOptions } from "../../../interface/pagination";
import { Properties } from "../properties/properties.schema";
import { Users } from "../users/users.schema";
import {
  ICreateDocument,
  IDocument,
  IDocumentFilters,
  IDocumentStats,
  IUpdateDocument,
} from "./documents.interface";
import { Documents } from "./documents.schema";

// Create a new document
const createDocument = async (
  payload: ICreateDocument,
  adminId: string,
): Promise<IDocument> => {
  // Verify that the property exists and is active
  const property = await Properties.findOne({
    _id: payload.propertyId,
    isActive: true,
    isDeleted: false,
  });

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found or inactive");
  }

  // Verify that the admin exists and is active
  const admin = await Users.findOne({
    _id: adminId,
    isActive: true,
    isDeleted: false,
  });

  if (!admin) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Admin user not found or inactive",
    );
  }

  const documentData = {
    ...payload,
    uploadedBy: adminId,
  };

  const document = await Documents.create(documentData);
  return document;
};

// Get all documents with filtering and pagination
const getAllDocuments = async (
  filters: IDocumentFilters,
  paginationOptions: IPaginationOptions,
): Promise<{ meta: any; data: any[] }> => {
  const { page, limit, skip, sortBy, sortOrder } =
    calculatePaginationFunction(paginationOptions);

  const query: any = { isDeleted: false };

  // Add filters
  if (filters.propertyId) {
    query.propertyId = filters.propertyId;
  }

  if (filters.fileType) {
    query.fileType = filters.fileType;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  if (filters.uploadedBy) {
    query.uploadedBy = filters.uploadedBy;
  }

  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  // Text search
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
  }

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortConditions.createdAt = -1; // Default sort by creation date
  }

  const result = await Documents.find(query)
    .populate("propertyId", "name address")
    .populate("uploadedBy", "name email")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Documents.countDocuments(query);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// Get documents for a specific property (for tenants)
const getPropertyDocuments = async (
  propertyId: string,
  paginationOptions: IPaginationOptions,
): Promise<{ meta: any; data: any[] }> => {
  const { page, limit, skip, sortBy, sortOrder } =
    calculatePaginationFunction(paginationOptions);

  // Verify that the property exists and is active
  const property = await Properties.findOne({
    _id: propertyId,
    isActive: true,
    isDeleted: false,
  });

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found or inactive");
  }

  const whereConditions = {
    propertyId,
    isActive: true,
    isDeleted: false,
  };

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortConditions.createdAt = -1; // Default sort by creation date
  }

  const result = await Documents.find(whereConditions)
    .populate("propertyId", "name address")
    .populate("uploadedBy", "name email")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Documents.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// Get documents for a tenant's property (for tenants)
const getTenantDocuments = async (
  tenantId: string,
  paginationOptions: IPaginationOptions,
): Promise<{ meta: any; data: any[] }> => {
  const { page, limit, skip, sortBy, sortOrder } =
    calculatePaginationFunction(paginationOptions);

  // First, find the tenant and get their property ID
  const tenant = await Users.findOne({
    _id: tenantId,
    role: "TENANT",
    isActive: true,
    isDeleted: false,
  });

  if (!tenant) {
    throw new ApiError(httpStatus.NOT_FOUND, "Tenant not found or inactive");
  }

  // Get the tenant's property ID
  const propertyId = tenant.propertyId;
  if (!propertyId) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Tenant is not assigned to any property",
    );
  }

  // Verify that the property exists and is active
  const property = await Properties.findOne({
    _id: propertyId,
    isActive: true,
    isDeleted: false,
  });

  if (!property) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property not found or inactive");
  }

  const whereConditions = {
    propertyId,
    isActive: true,
    isDeleted: false,
  };

  const sortConditions: { [key: string]: 1 | -1 } = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortConditions.createdAt = -1; // Default sort by creation date
  }

  const result = await Documents.find(whereConditions)
    .populate("propertyId", "name address")
    .populate("uploadedBy", "name email")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Documents.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// Get a single document by ID
const getDocumentById = async (id: string): Promise<any> => {
  const document = await Documents.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate("propertyId", "name address")
    .populate("uploadedBy", "name email");

  if (!document) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  return document;
};

// Update a document
const updateDocument = async (
  id: string,
  payload: IUpdateDocument,
  adminId: string,
): Promise<IDocument> => {
  const document = await Documents.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!document) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  // Verify that the admin exists and is active
  const admin = await Users.findOne({
    _id: adminId,
    isActive: true,
    isDeleted: false,
  });

  if (!admin) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Admin user not found or inactive",
    );
  }

  // Note: propertyId cannot be updated for security reasons

  const updatedDocument = await Documents.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updatedDocument) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  return updatedDocument;
};

// Delete a document (soft delete)
const deleteDocument = async (
  id: string,
  adminId: string,
): Promise<IDocument> => {
  const document = await Documents.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!document) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  // Verify that the admin exists and is active
  const admin = await Users.findOne({
    _id: adminId,
    isActive: true,
    isDeleted: false,
  });

  if (!admin) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Admin user not found or inactive",
    );
  }

  const deletedDocument = await Documents.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
      deletedAt: new Date(),
    },
    { new: true },
  );

  if (!deletedDocument) {
    throw new ApiError(httpStatus.NOT_FOUND, "Document not found");
  }

  return deletedDocument;
};

// Get document statistics
const getDocumentStats = async (
  propertyId?: string,
): Promise<IDocumentStats> => {
  const matchCondition: mongoose.FilterQuery<IDocument> = {
    isDeleted: false,
  };

  if (propertyId) {
    matchCondition.propertyId = propertyId;
  }

  const stats = await Documents.aggregate([
    { $match: matchCondition },
    {
      $facet: {
        totalDocuments: [{ $count: "count" }],
        documentsByType: [
          {
            $group: {
              _id: "$fileType",
              count: { $sum: 1 },
            },
          },
        ],
        documentsByCategory: [
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
        ],
        recentUploads: [
          {
            $match: {
              createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              },
            },
          },
          { $count: "count" },
        ],
      },
    },
  ]);

  const result = stats[0];
  const totalDocuments = result.totalDocuments[0]?.count || 0;
  const recentUploads = result.recentUploads[0]?.count || 0;

  // Process documents by type
  const documentsByType = {
    IMAGE: 0,
    PDF: 0,
    DOC: 0,
  };

  result.documentsByType.forEach((item: { _id: string; count: number }) => {
    if (item._id in documentsByType) {
      documentsByType[item._id as keyof typeof documentsByType] = item.count;
    }
  });

  // Process documents by category
  const documentsByCategory: Record<string, number> = {};
  result.documentsByCategory.forEach((item: { _id: string; count: number }) => {
    if (item._id) {
      documentsByCategory[item._id] = item.count;
    }
  });

  return {
    totalDocuments,
    documentsByType,
    documentsByCategory,
    recentUploads,
  };
};

// Get document categories
const getDocumentCategories = async (): Promise<string[]> => {
  const categories = await Documents.distinct("category", {
    isDeleted: false,
    category: { $ne: null },
  });

  return categories.filter(Boolean);
};

// Get document tags
const getDocumentTags = async (): Promise<string[]> => {
  const tags = await Documents.distinct("tags", {
    isDeleted: false,
    tags: { $ne: null },
  });

  return tags.filter(Boolean);
};

export const DocumentsService = {
  createDocument,
  getAllDocuments,
  getPropertyDocuments,
  getTenantDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  getDocumentCategories,
  getDocumentTags,
};
