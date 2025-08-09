import { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../../config/config";
import catchAsync from "../../../shared/catchAsync";
import {
  sendEmail,
  sendTenantInvitationEmail,
  verifyEmailConnection,
} from "../../../shared/emailService";
import sendResponse from "../../../shared/sendResponse";
import {
  IAdminUpdateUser,
  ICreateProperty,
  ICreateSpot,
  IInviteTenant,
  IUpdateProperty,
  IUpdateSpot,
} from "./admin.interface";
import { AdminService } from "./admin.service";

const inviteTenant = catchAsync(async (req: Request, res: Response) => {
  const inviteData: IInviteTenant = req.body;
  const result = await AdminService.inviteTenant(inviteData);

  // Generate URL with tenant data for auto-filling client UI
  const baseUrl = config.client_url || "http://localhost:3000";
  const tenantData = {
    id: result.user._id,
    name: result.user.name,
    email: result.user.email,
    phone: result.user.phoneNumber,
    preferredLocation: result.user.preferredLocation,
    propertyId: result.user.propertyId,
    spotId: result.user.spotId,
    // Add property details
    property: {
      id: result.property._id,
      name: result.property.name,
      address: result.property.address,
    },
    // Add spot details
    spot: {
      id: result.spot._id,
      spotNumber: result.spot.spotNumber,
      description: result.spot.description,
    },
  };

  // Encode the data as base64 to make it URL-safe
  const encodedData = Buffer.from(JSON.stringify(tenantData)).toString(
    "base64",
  );
  const autoFillUrl = `${baseUrl}/auth/tenant-setup?data=${encodedData}`;

  // Send invitation email to the tenant
  try {
    await sendTenantInvitationEmail(
      result.user.email,
      result.user.name,
      autoFillUrl,
      result.property.name,
      result.spot.spotNumber,
    );
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    // Continue with the response even if email fails
  }

  // Example of how to decode this URL on the client side:
  //
  // // In your React component or JavaScript file:
  // const getTenantDataFromUrl = () => {
  //   const urlParams = new URLSearchParams(window.location.search);
  //   const encodedData = urlParams.get('data');
  //
  //   if (encodedData) {
  //     try {
  //       const tenantData = JSON.parse(atob(encodedData));
  //       return {
  //         // User details
  //         id: tenantData.id,
  //         name: tenantData.name,
  //         email: tenantData.email,
  //         phone: tenantData.phone,
  //         preferredLocation: tenantData.preferredLocation,
  //         propertyId: tenantData.propertyId,
  //         spotId: tenantData.spotId,
  //         // Property details
  //         property: tenantData.property,
  //         // Spot details
  //         spot: tenantData.spot,
  //       };
  //     } catch (error) {
  //       console.error('Error decoding tenant data:', error);
  //       return null;
  //     }
  //   }
  //   return null;
  // };
  //
  // // Usage in React component:
  // const tenantData = getTenantDataFromUrl();
  // if (tenantData) {
  //   // Auto-fill your form fields
  //   setFormData({
  //     name: tenantData.name,
  //     email: tenantData.email,
  //     phone: tenantData.phone,
  //     preferredLocation: tenantData.preferredLocation,
  //   });
  //
  //   // Display property and spot information
  //   setPropertyInfo(tenantData.property);
  //   setSpotInfo(tenantData.spot);
  // }

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Tenant invited successfully",
    data: {
      user: {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phoneNumber,
        preferredLocation: result.user.preferredLocation,
        propertyId: result.user.propertyId,
        spotId: result.user.spotId,
      },
      property: {
        id: result.property._id,
        name: result.property.name,
        address: result.property.address,
      },
      spot: {
        id: result.spot._id,
        spotNumber: result.spot.spotNumber,
        description: result.spot.description,
      },
      autoFillUrl: autoFillUrl,
      message:
        "Invitation sent successfully. Tenant will receive login credentials via email.",
    },
  });
});

const getAllTenants = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllTenants();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tenants retrieved successfully",
    data: result,
  });
});

const createProperty = catchAsync(async (req: Request, res: Response) => {
  const propertyData: ICreateProperty = req.body;
  const result = await AdminService.createProperty(propertyData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Property created successfully",
    data: result,
  });
});

const getAllProperties = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllProperties();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Properties retrieved successfully",
    data: result,
  });
});

const getPropertyById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.getPropertyById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property retrieved successfully",
    data: result,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: IUpdateProperty = req.body;
  const result = await AdminService.updateProperty(id, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await AdminService.deleteProperty(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property deleted successfully",
    data: null,
  });
});

const createSpot = catchAsync(async (req: Request, res: Response) => {
  const spotData: ICreateSpot = req.body;
  const result = await AdminService.createSpot(spotData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Spot created successfully",
    data: result,
  });
});

const getSpotsByProperty = catchAsync(async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const { status } = req.query;

  const result = await AdminService.getSpotsByProperty(
    propertyId,
    status as string,
  );

  const message = status
    ? `Spots with status '${status}' retrieved successfully`
    : "All spots retrieved successfully";

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message,
    data: result,
  });
});

const getSpotById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.getSpotById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Spot retrieved successfully",
    data: result,
  });
});

const updateSpot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: IUpdateSpot = req.body;
  const result = await AdminService.updateSpot(id, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Spot updated successfully",
    data: result,
  });
});

const deleteSpot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await AdminService.deleteSpot(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Spot deleted successfully",
    data: null,
  });
});

// Get all service requests with full details (Admin only)
const getAllServiceRequests = catchAsync(
  async (req: Request, res: Response) => {
    const filters = req.query;
    const options = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      sortBy: (req.query.sortBy as string) || "requestedDate",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    };

    const result = await AdminService.getAllServiceRequests(filters, options);

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

// Get service request by ID with full details (Admin only)
const getServiceRequestById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "Service request ID is required",
        data: null,
      });
    }

    const result = await AdminService.getServiceRequestById(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service request retrieved successfully",
      data: result,
    });
  },
);

// Update service request status and details (Admin only)
const updateServiceRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Service request ID is required",
      data: null,
    });
  }

  const result = await AdminService.updateServiceRequest(id, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service request updated successfully",
    data: result,
  });
});

// Add admin comment to service request
const addAdminComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { comment } = req.body;

  if (!id) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Service request ID is required",
      data: null,
    });
  }

  if (!comment) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Comment is required",
      data: null,
    });
  }

  const result = await AdminService.addAdminComment(id, comment);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment added successfully",
    data: result,
  });
});

// Get service requests by property (Admin only)
const getServiceRequestsByProperty = catchAsync(
  async (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const filters = req.query;
    const options = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      sortBy: (req.query.sortBy as string) || "requestedDate",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    };

    if (!propertyId) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "Property ID is required",
        data: null,
      });
    }

    const result = await AdminService.getServiceRequestsByProperty(
      propertyId,
      filters,
      options,
    );

    const responseData = {
      serviceRequests: result.data,
      pagination: result.meta,
    };

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service requests by property retrieved successfully",
      data: responseData,
    });
  },
);

// Get service requests by tenant (Admin only)
const getServiceRequestsByTenant = catchAsync(
  async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const filters = req.query;
    const options = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      sortBy: (req.query.sortBy as string) || "requestedDate",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    };

    if (!tenantId) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: "Tenant ID is required",
        data: null,
      });
    }

    const result = await AdminService.getServiceRequestsByTenant(
      tenantId,
      filters,
      options,
    );

    const responseData = {
      serviceRequests: result.data,
      pagination: result.meta,
    };

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service requests by tenant retrieved successfully",
      data: responseData,
    });
  },
);

// Get urgent service requests (Admin only)
const getUrgentServiceRequests = catchAsync(
  async (req: Request, res: Response) => {
    const options = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    };

    const result = await AdminService.getUrgentServiceRequests(options);

    const responseData = {
      serviceRequests: result.data,
      pagination: result.meta,
    };

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Urgent service requests retrieved successfully",
      data: responseData,
    });
  },
);

// Get service request dashboard statistics (Admin only)
const getServiceRequestDashboardStats = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AdminService.getServiceRequestDashboardStats();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service request dashboard stats retrieved successfully",
      data: result,
    });
  },
);

// Admin User Management Controllers
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.getAllUsers(adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.getUserById(userId, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const updateData: IAdminUpdateUser = req.body;
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.updateUser(userId, updateData, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.deleteUser(userId, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

// Test email endpoint for debugging
const testEmail = catchAsync(async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Email parameter is required",
        data: null,
      });
    }

    // Test email connection
    const isConnected = await verifyEmailConnection();

    if (!isConnected) {
      return sendResponse(res, {
        statusCode: 500,
        success: false,
        message: "Email service is not properly configured",
        data: null,
      });
    }

    // Send test email
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Service Test</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 0 0 5px 5px;
          }
          .success {
            color: #4CAF50;
            font-weight: bold;
          }
          .info {
            background-color: #e3f2fd;
            padding: 15px;
            border-left: 4px solid #2196F3;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Email Service Test Successful!</h1>
        </div>
        
        <div class="content">
          <p>Hello!</p>
          
          <p class="success">This is a test email to verify that your Mailjet email service is working correctly.</p>
          
          <div class="info">
            <strong>Test Details:</strong><br>
            • Email sent at: ${new Date().toLocaleString()}<br>
            • Service: Mailjet<br>
            • Status: Working correctly
          </div>
          
          <p>If you received this email, it means:</p>
          <ul>
            <li>Your Mailjet API keys are configured correctly</li>
            <li>Your sender email is verified</li>
            <li>The email service is ready for production use</li>
          </ul>
          
          <p>You can now use the email service to send invitation emails and other notifications.</p>
          
          <p>Best regards,<br>
          Rental Portal Management System</p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: "🎉 Email Service Test - Rental Portal Management",
      html: testHtml,
    });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Test email sent successfully",
      data: {
        connected: true,
        email_sent_to: email,
        mailjet_api_key: process.env.MAILJET_API_KEY
          ? "Configured"
          : "Not configured",
        mailjet_api_secret: process.env.MAILJET_SECRET_KEY
          ? "Configured"
          : "Not configured",
        mailjet_sender_email: process.env.MAILJET_SENDER_EMAIL
          ? "Configured"
          : "Not configured",
      },
    });
  } catch (error) {
    return sendResponse(res, {
      statusCode: 500,
      success: false,
      message: "Email test failed",
      data: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

// Get all payments (Admin)
const getPayments = catchAsync(async (req: Request, res: Response) => {
  const filters = req.query;
  const options = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: (req.query.sortBy as string) || "createdAt",
    sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
  };

  const result = await AdminService.getPayments(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments retrieved successfully",
    data: {
      payments: result.data,
      pagination: result.meta,
    },
  });
});

// Archive and Restore Controllers

const archiveProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.archiveProperty(id, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property archived successfully",
    data: result,
  });
});

const restoreProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.restoreProperty(id, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Property restored successfully",
    data: result,
  });
});

const archiveSpot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.archiveSpot(id, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Spot archived successfully",
    data: result,
  });
});

const restoreSpot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.restoreSpot(id, adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Spot restored successfully",
    data: result,
  });
});

const getArchivedProperties = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = req.user?._id?.toString();
    if (!adminId) {
      throw new Error("Admin ID not found");
    }

    const result = await AdminService.getArchivedProperties(adminId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Archived properties retrieved successfully",
      data: result,
    });
  },
);

const getArchivedSpots = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?._id?.toString();
  if (!adminId) {
    throw new Error("Admin ID not found");
  }

  const result = await AdminService.getArchivedSpots(adminId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Archived spots retrieved successfully",
    data: result,
  });
});

export const AdminController = {
  inviteTenant,
  getAllTenants,
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  createSpot,
  getSpotsByProperty,
  getSpotById,
  updateSpot,
  deleteSpot,
  getAllServiceRequests,
  getServiceRequestById,
  updateServiceRequest,
  addAdminComment,
  getServiceRequestsByProperty,
  getServiceRequestsByTenant,
  getUrgentServiceRequests,
  getServiceRequestDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  testEmail,
  archiveProperty,
  restoreProperty,
  archiveSpot,
  restoreSpot,
  getArchivedProperties,
  getArchivedSpots,
  getPayments,
};
