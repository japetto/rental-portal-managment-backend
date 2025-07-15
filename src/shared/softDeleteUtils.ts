import httpStatus from "http-status";
import ApiError from "../errors/ApiError";

// Utility function for soft delete
export const softDelete = async (
  model: any,
  id: string,
  deletedBy?: string,
) => {
  const updateData: any = {
    isActive: false,
    isDeleted: true,
    deletedAt: new Date(),
  };

  // Add deletedBy if provided
  if (deletedBy) {
    updateData.deletedBy = deletedBy;
  }

  const result = await model.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Record not found");
  }

  return result;
};

// Utility function to restore soft deleted record
export const restoreRecord = async (
  model: any,
  id: string,
  restoredBy?: string,
) => {
  const updateData: any = {
    isActive: true,
    isDeleted: false,
    deletedAt: null,
  };

  // Add restoredBy if provided
  if (restoredBy) {
    updateData.restoredBy = restoredBy;
  }

  const result = await model.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Record not found");
  }

  return result;
};

// Utility function to get only active records
export const getActiveRecords = async (model: any, query: any = {}) => {
  return await model.find({
    ...query,
    isDeleted: false,
  });
};

// Utility function to get deleted records
export const getDeletedRecords = async (model: any, query: any = {}) => {
  return await model.find({
    ...query,
    isDeleted: true,
  });
};

// Utility function to get all records (active and deleted)
export const getAllRecords = async (model: any, query: any = {}) => {
  return await model.find(query);
};

// Utility function to permanently delete a record
export const permanentDelete = async (model: any, id: string) => {
  const result = await model.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Record not found");
  }

  return result;
};
