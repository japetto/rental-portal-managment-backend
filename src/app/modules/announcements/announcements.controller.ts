import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AnnouncementService } from "./announcements.service";

// Create Announcement (Admin only)
const createAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const { ...announcementData } = req.body;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AnnouncementService.createAnnouncement(
    announcementData,
    adminId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Announcement created successfully",
    data: result,
  });
});

// Get All Announcements (Admin only)
const getAllAnnouncements = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AnnouncementService.getAllAnnouncements(adminId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Announcements retrieved successfully",
    data: result,
  });
});

// Get Announcement by ID
const getAnnouncementById = catchAsync(async (req: Request, res: Response) => {
  const { announcementId } = req.params;
  const adminId = req.user?._id?.toString();

  const result = await AnnouncementService.getAnnouncementById(
    announcementId,
    adminId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Announcement retrieved successfully",
    data: result,
  });
});

// Update Announcement (Admin only)
const updateAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const { announcementId } = req.params;
  const { ...updateData } = req.body;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AnnouncementService.updateAnnouncement(
    announcementId,
    updateData,
    adminId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Announcement updated successfully",
    data: result,
  });
});

// Delete Announcement (Admin only)
const deleteAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const { announcementId } = req.params;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AnnouncementService.deleteAnnouncement(
    announcementId,
    adminId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Announcement deleted successfully",
    data: result,
  });
});

// Get Announcements by Property (Admin only)
const getAnnouncementsByProperty = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const adminId = req.user?._id?.toString();

    if (!adminId) {
      throw new Error("Admin ID not found");
    }

    const result = await AnnouncementService.getAnnouncementsByProperty(
      propertyId,
      adminId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property announcements retrieved successfully",
      data: result,
    });
  },
);

// Get Announcements by Type (Admin only)
const getAnnouncementsByType = catchAsync(
  async (req: Request, res: Response) => {
    const { type } = req.params;
    const adminId = req.user?._id?.toString();

    if (!adminId) {
      throw new Error("Admin ID not found");
    }

    const result = await AnnouncementService.getAnnouncementsByType(
      type,
      adminId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Announcements by type retrieved successfully",
      data: result,
    });
  },
);

// Get Announcements by Priority (Admin only)
const getAnnouncementsByPriority = catchAsync(
  async (req: Request, res: Response) => {
    const { priority } = req.params;
    const adminId = req.user?._id?.toString();

    if (!adminId) {
      throw new Error("Admin ID not found");
    }

    const result = await AnnouncementService.getAnnouncementsByPriority(
      priority,
      adminId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Announcements by priority retrieved successfully",
      data: result,
    });
  },
);

// Archive and Restore Controllers

const archiveAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const { announcementId } = req.params;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AnnouncementService.archiveAnnouncement(
    announcementId,
    adminId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Announcement archived successfully",
    data: result,
  });
});

const restoreAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const { announcementId } = req.params;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AnnouncementService.restoreAnnouncement(
    announcementId,
    adminId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Announcement restored successfully",
    data: result,
  });
});

const getArchivedAnnouncements = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = req.user?._id?.toString();

    if (!adminId) {
      throw new Error("Admin ID not found");
    }

    const result = await AnnouncementService.getArchivedAnnouncements(adminId);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Archived announcements retrieved successfully",
      data: result,
    });
  },
);

// Get Tenant Announcements (for tenants to get their announcements)
const getTenantAnnouncements = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = req.user?._id?.toString();

    if (!tenantId) {
      throw new Error("Tenant ID not found");
    }

    const result = await AnnouncementService.getTenantAnnouncements(tenantId);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Tenant announcements retrieved successfully",
      data: result,
    });
  },
);

export const AnnouncementController = {
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
};
