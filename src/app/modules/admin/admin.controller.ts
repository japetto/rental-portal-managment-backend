import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import {
  ICreateProperty,
  IInviteTenant,
  IUpdateProperty,
} from "./admin.interface";
import { AdminService } from "./admin.service";

const inviteTenant = catchAsync(async (req: Request, res: Response) => {
  const inviteData: IInviteTenant = req.body;
  const result = await AdminService.inviteTenant(inviteData);

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
      },
      message:
        "Invitation sent successfully. Tenant will receive login credentials.",
    },
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

export const AdminController = {
  inviteTenant,
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
};
