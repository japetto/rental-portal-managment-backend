import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StripeAccounts } from "../stripe/stripe-accounts.schema";
import { Properties } from "./properties.schema";

export class PropertiesController {
  // Get all properties with Stripe account details
  static getAllPropertiesWithStripeDetails = catchAsync(
    async (req: Request, res: Response) => {
      const properties = await Properties.find({ isDeleted: false })
        .populate({
          path: "stripeAccountId",
          select:
            "name description stripeAccountId isActive isVerified businessName businessEmail isGlobalAccount",
          match: { isDeleted: false },
        })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });

      // Transform the data to include Stripe details
      const propertiesWithStripe = properties.map(property => {
        const propertyObj = property.toObject();

        return {
          _id: propertyObj._id,
          name: propertyObj.name,
          description: propertyObj.description,
          address: propertyObj.address,
          amenities: propertyObj.amenities,
          images: propertyObj.images,
          rules: propertyObj.rules,
          isActive: propertyObj.isActive,
          createdAt: propertyObj.createdAt,
          updatedAt: propertyObj.updatedAt,
          totalSpots: propertyObj.totalSpots || 0,
          availableSpots: propertyObj.availableSpots || 0,
          stripeAccount: propertyObj.stripeAccountId
            ? {
                _id: (propertyObj.stripeAccountId as any)._id,
                name: (propertyObj.stripeAccountId as any).name,
                description: (propertyObj.stripeAccountId as any).description,
                stripeAccountId: (propertyObj.stripeAccountId as any)
                  .stripeAccountId,
                isActive: (propertyObj.stripeAccountId as any).isActive,
                isVerified: (propertyObj.stripeAccountId as any).isVerified,
                businessName: (propertyObj.stripeAccountId as any).businessName,
                businessEmail: (propertyObj.stripeAccountId as any)
                  .businessEmail,
                isGlobalAccount: (propertyObj.stripeAccountId as any)
                  .isGlobalAccount,
              }
            : null,
          hasStripeAccount: !!propertyObj.stripeAccountId,
        };
      });

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Properties with Stripe details retrieved successfully",
        data: propertiesWithStripe,
      });
    },
  );

  // Get properties with available Stripe accounts (including global accounts)
  static getPropertiesWithAvailableStripeAccounts = catchAsync(
    async (req: Request, res: Response) => {
      const properties = await Properties.find({ isDeleted: false })
        .populate({
          path: "stripeAccountId",
          select:
            "name description stripeAccountId isActive isVerified businessName businessEmail isGlobalAccount",
          match: { isDeleted: false },
        })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });

      // Get all global Stripe accounts
      const globalAccounts = await StripeAccounts.find({
        isGlobalAccount: true,
        isActive: true,
        isVerified: true,
        isDeleted: false,
      }).select("name description stripeAccountId businessName businessEmail");

      // Transform the data to include available Stripe accounts
      const propertiesWithAvailableStripe = properties.map(property => {
        const propertyObj = property.toObject();

        // Property-specific account
        const propertyStripeAccount = propertyObj.stripeAccountId
          ? {
              _id: (propertyObj.stripeAccountId as any)._id,
              name: (propertyObj.stripeAccountId as any).name,
              description: (propertyObj.stripeAccountId as any).description,
              stripeAccountId: (propertyObj.stripeAccountId as any)
                .stripeAccountId,
              isActive: (propertyObj.stripeAccountId as any).isActive,
              isVerified: (propertyObj.stripeAccountId as any).isVerified,
              businessName: (propertyObj.stripeAccountId as any).businessName,
              businessEmail: (propertyObj.stripeAccountId as any).businessEmail,
              isGlobalAccount: (propertyObj.stripeAccountId as any)
                .isGlobalAccount,
              accountType: "PROPERTY_SPECIFIC",
            }
          : null;

        return {
          _id: propertyObj._id,
          name: propertyObj.name,
          description: propertyObj.description,
          address: propertyObj.address,
          amenities: propertyObj.amenities,
          images: propertyObj.images,
          rules: propertyObj.rules,
          isActive: propertyObj.isActive,
          createdAt: propertyObj.createdAt,
          updatedAt: propertyObj.updatedAt,
          totalSpots: propertyObj.totalSpots || 0,
          availableSpots: propertyObj.availableSpots || 0,
          stripeAccount: propertyStripeAccount,
          availableStripeAccounts: {
            propertySpecific: propertyStripeAccount,
            globalAccounts: globalAccounts.map(account => ({
              _id: account._id,
              name: account.name,
              description: account.description,
              stripeAccountId: account.stripeAccountId,
              businessName: account.businessName,
              businessEmail: account.businessEmail,
              accountType: "GLOBAL",
            })),
            hasPropertySpecific: !!propertyStripeAccount,
            hasGlobalAccounts: globalAccounts.length > 0,
            totalAvailableAccounts:
              (propertyStripeAccount ? 1 : 0) + globalAccounts.length,
          },
        };
      });

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message:
          "Properties with available Stripe accounts retrieved successfully",
        data: propertiesWithAvailableStripe,
      });
    },
  );

  // Get properties without Stripe accounts
  static getPropertiesWithoutStripeAccounts = catchAsync(
    async (req: Request, res: Response) => {
      const properties = await Properties.find({
        isDeleted: false,
        $or: [
          { stripeAccountId: { $exists: false } },
          { stripeAccountId: null },
        ],
      })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });

      const propertiesWithoutStripe = properties.map(property => {
        const propertyObj = property.toObject();

        return {
          _id: propertyObj._id,
          name: propertyObj.name,
          description: propertyObj.description,
          address: propertyObj.address,
          amenities: propertyObj.amenities,
          images: propertyObj.images,
          rules: propertyObj.rules,
          isActive: propertyObj.isActive,
          createdAt: propertyObj.createdAt,
          updatedAt: propertyObj.updatedAt,
          totalSpots: propertyObj.totalSpots || 0,
          availableSpots: propertyObj.availableSpots || 0,
          stripeAccount: null,
          hasStripeAccount: false,
        };
      });

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Properties without Stripe accounts retrieved successfully",
        data: propertiesWithoutStripe,
      });
    },
  );
}
