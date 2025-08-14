import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";

import { UserService } from "./users.service";

// User Register
const userRegister = catchAsync(async (req: Request, res: Response) => {
  const { ...userInfo } = req.body;

  const result = await UserService.userRegister(userInfo);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Registration Successful",
    data: result,
  });
});

// User Login
const userLogin = catchAsync(async (req: Request, res: Response) => {
  const { ...authCredentials } = req.body;

  const result = await UserService.userLogin(authCredentials);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Login Successful",
    data: result,
  });
});

// // Check User Exists
// const checkUserForProviderLogin = catchAsync(
//   async (req: Request, res: Response) => {
//     const { ...userInfo } = req.body;

//     const result = await UserService.checkUserForProviderLogin(userInfo);

//     sendResponse(res, {
//       success: true,
//       statusCode: httpStatus.OK,
//       message: "Login Successful",
//       data: result,
//     });
//   },
// );

// // Check User Exists
// const providerLogin = catchAsync(async (req: Request, res: Response) => {
//   const { userInfo, authMethod } = req.body;

//   const result = await UserService.providerLogin(userInfo, authMethod);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "Login Successful",
//     data: result,
//   });
// });

// // Update User
// const updatedUser = catchAsync(async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { ...payload } = req.body;
//   const token = verifyAuthToken(req);

//   const result = await UserService.updateUser(id, payload, token);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "User Updated Successfully",
//     data: result,
//   });
// });

// // Update User
// const updatePassword = catchAsync(async (req: Request, res: Response) => {
//   const { ...payload } = req.body;
//   const token = verifyAuthToken(req);

//   const result = await UserService.updatePassword(payload, token);

//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "User Updated Successfully",
//     data: result,
//   });
// });

// // Find User For Forgot Password
// const findUserForForgotPassword = catchAsync(
//   async (req: Request, res: Response) => {
//     const { email } = req.body;

//     const result = await UserService.findUserForForgotPassword(email);

//     sendResponse(res, {
//       success: true,
//       statusCode: httpStatus.OK,
//       message: "OTP has been sent to your email",
//       data: result,
//     });
//   },
// );

// // Find User For Forgot Password
// const verifyOtpForForgotPassword = catchAsync(
//   async (req: Request, res: Response) => {
//     const { email, otp } = req.body;

//     const result = await UserService.verifyOtpForForgotPassword(email, otp);

//     sendResponse(res, {
//       success: true,
//       statusCode: httpStatus.OK,
//       message: "OTP Successfully Verified!",
//       data: result,
//     });
//   },
// );

// // Forgot Password
// const forgotPassword = catchAsync(async (req: Request, res: Response) => {
//   const { ...payload } = req.body;
//   const result = await UserService.forgotPassword(payload);
//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "Password Updated Successfully",
//     data: result,
//   });
// });

// Set Password for Invited Users
const setPassword = catchAsync(async (req: Request, res: Response) => {
  const { ...passwordData } = req.body;

  const result = await UserService.setPassword(passwordData);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Password set successfully",
    data: result,
  });
});

// Update User Info (Admin only)
const updateUserInfo = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { ...updateData } = req.body;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await UserService.updateUserInfo(userId, updateData, adminId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User information updated successfully",
    data: result,
  });
});

// Update Tenant Data (Admin only)
const updateTenantData = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { ...updateData } = req.body;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await UserService.updateTenantData(
    userId,
    updateData,
    adminId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Tenant data updated successfully",
    data: result,
  });
});

// Delete User (Super Admin only)
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await UserService.deleteUser(userId, adminId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User deleted successfully",
    data: result,
  });
});

// Get All Users (Admin only)
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await UserService.getAllUsers(adminId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Users retrieved successfully",
    data: result,
  });
});

// Get All Tenants (Admin only)
const getAllTenants = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await UserService.getAllTenants(adminId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Tenants retrieved successfully",
    data: result,
  });
});

// Get User by ID (Admin only)
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const adminId = req.user?._id?.toString();

  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await UserService.getUserById(userId, adminId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User retrieved successfully",
    data: result,
  });
});

// Check User Invitation Status
const checkUserInvitationStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.params;

    const result = await UserService.checkUserInvitationStatus(email);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User invitation status retrieved successfully",
      data: result,
    });
  },
);

// Get User's Service Requests
const getUserServiceRequests = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?._id?.toString();

    if (!userId) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "User not authenticated",
        data: null,
      });
    }

    const filters = req.query;
    const options = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      sortBy: (req.query.sortBy as string) || "requestedDate",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    };

    // Import the service request service
    const { ServiceRequestService } = await import(
      "../service-requests/service-requests.service"
    );

    const result = await ServiceRequestService.getServiceRequests(
      filters,
      options,
      userId,
      req.user?.role || "TENANT", // Use actual user role
    );

    const responseData = {
      serviceRequests: result.data,
      pagination: result.meta,
    };

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service requests retrieved successfully",
      data: responseData,
    });
  },
);

// Get User's Service Request by ID
const getUserServiceRequestById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId || !id) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "User not authenticated or invalid request ID",
        data: null,
      });
    }

    // Import the service request service
    const { ServiceRequestService } = await import(
      "../service-requests/service-requests.service"
    );

    const result = await ServiceRequestService.getServiceRequestById(
      id,
      userId,
      req.user?.role || "TENANT", // Use actual user role
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service request retrieved successfully",
      data: result,
    });
  },
);

// Get User's Announcements
const getUserAnnouncements = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated",
      data: null,
    });
  }

  // Get propertyId from query or use user's assigned property
  const { propertyId: queryPropertyId } = req.query;
  const userPropertyId = req.user?.propertyId?.toString();
  const propertyId = (queryPropertyId as string) || userPropertyId;

  // Import the announcement service
  const { AnnouncementService } = await import(
    "../announcements/announcements.service"
  );

  const result = await AnnouncementService.getTenantAnnouncements(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Announcements retrieved successfully",
    data: result,
  });
});

// Get User's Announcement by ID
const getUserAnnouncementById = catchAsync(
  async (req: Request, res: Response) => {
    const { announcementId } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId || !announcementId) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "User not authenticated or invalid announcement ID",
        data: null,
      });
    }

    // Import the announcement service
    const { AnnouncementService } = await import(
      "../announcements/announcements.service"
    );

    const result = await AnnouncementService.getAnnouncementById(
      announcementId,
      userId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Announcement retrieved successfully",
      data: result,
    });
  },
);

// Mark Announcement as Read for User
const markAnnouncementAsRead = catchAsync(
  async (req: Request, res: Response) => {
    const { ...markAsReadData } = req.body;
    const userId = req.user?._id?.toString();

    if (!userId) {
      return sendResponse(res, {
        statusCode: httpStatus.UNAUTHORIZED,
        success: false,
        message: "User not authenticated",
        data: null,
      });
    }

    // Add userId to the markAsReadData
    const dataWithUserId = {
      ...markAsReadData,
      userId,
    };

    // Import the announcement service
    const { AnnouncementService } = await import(
      "../announcements/announcements.service"
    );

    const result = await AnnouncementService.markAsRead(dataWithUserId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Announcement marked as read",
      data: result,
    });
  },
);

// Get User's Own Profile
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: "User not authenticated",
      data: null,
    });
  }

  const result = await UserService.getComprehensiveUserProfile(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

export const UserController = {
  userRegister,
  userLogin,
  setPassword,
  updateUserInfo,
  updateTenantData,
  deleteUser,
  getAllUsers,
  getAllTenants,
  getUserById,
  checkUserInvitationStatus,
  getUserServiceRequests,
  getUserServiceRequestById,
  getUserAnnouncements,
  getUserAnnouncementById,
  markAnnouncementAsRead,
  getMyProfile,
};
