import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { Users } from "../users/users.schema";
import {
  IAnnouncement,
  ICreateAnnouncement,
  IMarkAsRead,
  IUpdateAnnouncement,
} from "./announcements.interface";
import { Announcements } from "./announcements.schema";

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

  const announcements = await Announcements.find({})
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

//* Get Active Announcements (Public - for tenants)
const getActiveAnnouncements = async (
  userId?: string,
  propertyId?: string,
): Promise<IAnnouncement[]> => {
  const query: any = {
    isActive: true,
    createdAt: { $lte: new Date() },
    $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
  };

  // Filter by property if specified
  if (propertyId) {
    query.$or = [
      { propertyId: propertyId },
      { propertyId: null }, // System-wide announcements
    ];
  }

  // Filter by target audience
  query.$or = [{ targetAudience: "ALL" }, { targetAudience: "TENANTS_ONLY" }];

  const announcements = await Announcements.find(query)
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .sort({ priority: -1, createdAt: -1 });

  return announcements;
};

//* Get Announcement by ID
const getAnnouncementById = async (
  announcementId: string,
  adminId?: string,
): Promise<IAnnouncement> => {
  const announcement = await Announcements.findById(announcementId)
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

  await Announcements.findByIdAndDelete(announcementId);

  return {
    message: "Announcement deleted successfully",
  };
};

//* Mark Announcement as Read
const markAsRead = async (
  payload: IMarkAsRead,
): Promise<{ message: string }> => {
  const { userId, announcementId } = payload;

  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const announcement = await Announcements.findById(announcementId);
  if (!announcement) {
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found");
  }

  // Check if user has already read this announcement
  const hasRead = announcement.readBy.some(id => id.toString() === userId);
  if (hasRead) {
    return {
      message: "Announcement already marked as read",
    };
  }

  await Announcements.findByIdAndUpdate(announcementId, {
    $addToSet: { readBy: userId },
  });

  return {
    message: "Announcement marked as read",
  };
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

  const announcements = await Announcements.find({ type })
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

  const announcements = await Announcements.find({ priority })
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

//* Get Unread Announcements for User
const getUnreadAnnouncements = async (
  userId: string,
  propertyId?: string,
): Promise<IAnnouncement[]> => {
  const user = await Users.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const query: any = {
    isActive: true,
    createdAt: { $lte: new Date() },
    $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
    readBy: { $ne: userId },
  };

  // Filter by property if specified
  if (propertyId) {
    query.$or = [
      { propertyId: propertyId },
      { propertyId: null }, // System-wide announcements
    ];
  }

  // Filter by target audience
  query.$or = [{ targetAudience: "ALL" }, { targetAudience: "TENANTS_ONLY" }];

  const announcements = await Announcements.find(query)
    .populate({
      path: "propertyId",
      select: "name description address",
    })
    .sort({ priority: -1, createdAt: -1 });

  return announcements;
};

export const AnnouncementService = {
  createAnnouncement,
  getAllAnnouncements,
  getActiveAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  markAsRead,
  getAnnouncementsByProperty,
  getAnnouncementsByType,
  getAnnouncementsByPriority,
  getUnreadAnnouncements,
};
