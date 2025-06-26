import { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../../config/config";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import {
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
    id: result._id,
    name: result.name,
    email: result.email,
    phone: result.phoneNumber,
    preferredLocation: result.preferredLocation,
    propertyId: result.propertyId,
    spotId: result.spotId,
  };

  // Encode the data as base64 to make it URL-safe
  const encodedData = Buffer.from(JSON.stringify(tenantData)).toString(
    "base64",
  );
  const autoFillUrl = `${baseUrl}/tenant-setup?data=${encodedData}`;

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
  //         id: tenantData.id,
  //         name: tenantData.name,
  //         email: tenantData.email,
  //         phone: tenantData.phone,
  //         preferredLocation: tenantData.preferredLocation,
  //         propertyId: tenantData.propertyId,
  //         spotId: tenantData.spotId,
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
  // }

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Tenant invited successfully",
    data: {
      user: {
        _id: result._id,
        name: result.name,
        email: result.email,
        phoneNumber: result.phoneNumber,
        role: result.role,
        isInvited: result.isInvited,
        propertyId: result.propertyId,
        spotId: result.spotId,
        preferredLocation: result.preferredLocation,
      },
      autoFillUrl: autoFillUrl,
      message:
        "Invitation sent successfully. Tenant will receive login credentials.",
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
};
