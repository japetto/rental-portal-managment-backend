import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { Users } from "../users/users.schema";
import {
  IAnnouncement,
  ICreateAnnouncement,
  IUpdateAnnouncement,
} from "./announcements.interface";
import { Announcements } from "./announcements.schema";

// Import soft delete utilities
import * as SoftDeleteUtils from "../../../shared/softDeleteUtils";

//* Create Announcement
const createAnnouncement = async (
  payload: ICreateAnnouncement,
  adminId: string,
): Promise<IAnnouncement> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can create announcements",
    );
  }

  const announcementData = {
    ...payload,
    createdBy: adminId,
  };

  const announcement = await Announcements.create(announcementData);
  return announcement;
};

//* Get All Announcements (Admin)
const getAllAnnouncements = async (
  adminId: string,
): Promise<IAnnouncement[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view all announcements",
    );
  }

  const announcements = await Announcements.find({ isDeleted: false })
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .populate({
      path: "readBy",
      select: "name email",
    })
    .sort({ createdAt: -1 });

  return announcements;
};

//* Get Announcement by ID
const getAnnouncementById = async (
  announcementId: string,
  adminId?: string,
): Promise<IAnnouncement> => {
  const announcement = await Announcements.findOne({
    _id: announcementId,
    isDeleted: false,
  })
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .populate({
      path: "readBy",
      select: "name email",
    });

  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found");
  }

  // If admin is provided, check permissions
  if (adminId) {
    const admin = await Users.findById(adminId);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
    }
  }

  return announcement;
};

//* Update Announcement
const updateAnnouncement = async (
  announcementId: string,
  payload: IUpdateAnnouncement,
  adminId: string,
): Promise<IAnnouncement> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can update announcements",
    );
  }

  const announcement = await Announcements.findById(announcementId);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found");
  }

  const updatedAnnouncement = await Announcements.findByIdAndUpdate(
    announcementId,
    payload,
    { new: true, runValidators: true },
  ).populate({
    path: "propertyId",
    select: "name description address",
  });

  if (!updatedAnnouncement) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update announcement",
    );
  }

  return updatedAnnouncement;
};

//* Delete Announcement
const deleteAnnouncement = async (
  announcementId: string,
  adminId: string,
): Promise<{ message: string }> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can delete announcements",
    );
  }

  const announcement = await Announcements.findById(announcementId);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found");
  }

  await SoftDeleteUtils.softDelete(Announcements, announcementId, adminId);

  return {
    message: "Announcement archived successfully",
  };
};

// Archive an announcement (soft delete)
const archiveAnnouncement = async (
  announcementId: string,
  adminId: string,
): Promise<{ message: string }> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can archive announcements",
    );
  }

  const announcement = await Announcements.findOne({
    _id: announcementId,
    isDeleted: false,
  });
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found");
  }

  await SoftDeleteUtils.softDelete(Announcements, announcementId, adminId);

  return {
    message: "Announcement archived successfully",
  };
};

// Restore an announcement
const restoreAnnouncement = async (
  announcementId: string,
  adminId: string,
): Promise<{ message: string }> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can restore announcements",
    );
  }

  const announcement = await Announcements.findOne({
    _id: announcementId,
    isDeleted: true,
  });
  if (!announcement) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Announcement not found or not archived",
    );
  }

  await SoftDeleteUtils.restoreRecord(Announcements, announcementId, adminId);

  return {
    message: "Announcement restored successfully",
  };
};

// Get archived announcements
const getArchivedAnnouncements = async (
  adminId: string,
): Promise<IAnnouncement[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view archived announcements",
    );
  }

  const archivedAnnouncements = await Announcements.find({ isDeleted: true })
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .populate({
      path: "readBy",
      select: "name email",
    })
    .sort({ deletedAt: -1 });

  return archivedAnnouncements;
};

//* Get Announcements by Property
const getAnnouncementsByProperty = async (
  propertyId: string,
  adminId: string,
): Promise<IAnnouncement[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can view property announcements",
    );
  }

  const announcements = await Announcements.find({
    isDeleted: false,
    $or: [
      { propertyId: propertyId },
      { propertyId: null }, // System-wide announcements
    ],
  })
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .populate({
      path: "readBy",
      select: "name email",
    })
    .sort({ createdAt: -1 });

  return announcements;
};

//* Get Announcements by Type
const getAnnouncementsByType = async (
  type: string,
  adminId: string,
): Promise<IAnnouncement[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can filter announcements",
    );
  }

  const announcements = await Announcements.find({ type, isDeleted: false })
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .populate({
      path: "readBy",
      select: "name email",
    })
    .sort({ createdAt: -1 });

  return announcements;
};

//* Get Announcements by Priority
const getAnnouncementsByPriority = async (
  priority: string,
  adminId: string,
): Promise<IAnnouncement[]> => {
  const admin = await Users.findById(adminId);
  if (!admin || admin.role !== "SUPER_ADMIN") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only super admins can filter announcements",
    );
  }

  const announcements = await Announcements.find({ priority, isDeleted: false })
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .populate({
      path: "readBy",
      select: "name email",
    })
    .sort({ createdAt: -1 });

  return announcements;
};

//* Get Tenant Announcements (for tenants to get their announcements)
const getTenantAnnouncements = async (
  tenantId: string,
): Promise<IAnnouncement[]> => {
  const user = await Users.findById(tenantId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Get user's property ID
  const userPropertyId = user.propertyId?.toString();

  // Build the query for announcements that are relevant to this tenant
  const baseQuery: any = {
    isDeleted: false, // Only get non-deleted announcements
  };

  // Build target audience conditions
  const targetAudienceConditions: any[] = [
    { targetAudience: "ALL" },
    { targetAudience: "TENANTS_ONLY" },
  ];

  // Include PROPERTY_SPECIFIC announcements for user's property
  if (userPropertyId) {
    targetAudienceConditions.push({
      $and: [
        { targetAudience: "PROPERTY_SPECIFIC" },
        { propertyId: userPropertyId },
      ],
    });
  }

  // Combine all conditions
  const query = {
    ...baseQuery,
    $or: targetAudienceConditions,
  };

  const announcements = await Announcements.find(query)
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .sort({ priority: -1, createdAt: -1 });

  return announcements;
};

//* Mark announcement as read for a user
const markAsRead = async (data: {
  userId: string;
  announcementId: string;
}): Promise<IAnnouncement> => {
  const { userId, announcementId } = data;

  // Validate user exists
  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Validate announcement exists
  const announcement = await Announcements.findById(announcementId);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found");
  }

  // Check if user has already read this announcement
  if (announcement.readBy.includes(userId as any)) {
    return announcement;
  }

  // Add user to readBy array
  const updatedAnnouncement = await Announcements.findByIdAndUpdate(
    announcementId,
    {
      $addToSet: { readBy: userId },
    },
    { new: true },
  ).populate({
    path: "propertyId",
    select: "name description address",
  });

  if (!updatedAnnouncement) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to mark announcement as read",
    );
  }

  return updatedAnnouncement;
};

export const AnnouncementService = {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementsByProperty,
  getAnnouncementsByType,
  getAnnouncementsByPriority,
  archiveAnnouncement,
  restoreAnnouncement,
  getArchivedAnnouncements,
  getTenantAnnouncements,
  markAsRead,
};
