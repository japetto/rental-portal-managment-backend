import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Properties } from "./properties.schema";

export class PropertiesController {
  // Get all properties with Stripe account details
  static getAllPropertiesWithStripeDetails = catchAsync(
    async (req: Request, res: Response) => {
      const properties = await Properties.find({ isDeleted: false })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });

      // Get all Stripe accounts with their property assignments
      const { StripeAccounts } = await import(
        "../stripe/stripe-accounts.schema"
      );
      const stripeAccounts = await StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select(
          "name description stripeAccountId isActive isVerified businessName businessEmail isGlobalAccount isDefaultAccount propertyIds",
        );

      // Create a map of property ID to Stripe account
      const propertyToStripeMap = new Map();
      stripeAccounts.forEach(account => {
        account.propertyIds.forEach((propertyId: any) => {
          propertyToStripeMap.set(propertyId._id.toString(), {
            _id: account._id,
            name: account.name,
            description: account.description,
            stripeAccountId: account.stripeAccountId,
            isActive: account.isActive,
            isVerified: account.isVerified,
            businessName: account.businessName,
            businessEmail: account.businessEmail,
            isGlobalAccount: account.isGlobalAccount,
            isDefaultAccount: account.isDefaultAccount,
          });
        });
      });

      // Transform the data to include Stripe details
      const propertiesWithStripe = properties.map(property => {
        const propertyObj = property.toObject() as any;
        const stripeAccount = propertyToStripeMap.get(
          propertyObj._id.toString(),
        );

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
          stripeAccount: stripeAccount || null,
          hasStripeAccount: !!stripeAccount,
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
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });

      // Get all Stripe accounts with their property assignments
      const { StripeAccounts } = await import(
        "../stripe/stripe-accounts.schema"
      );
      const stripeAccounts = await StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select(
          "name description stripeAccountId isActive isVerified businessName businessEmail isGlobalAccount isDefaultAccount propertyIds",
        );

      // Get all global Stripe accounts
      const globalAccounts = await StripeAccounts.find({
        isGlobalAccount: true,
        isActive: true,
        isVerified: true,
        isDeleted: false,
      }).select("name description stripeAccountId businessName businessEmail");

      // Create a map of property ID to Stripe account
      const propertyToStripeMap = new Map();
      stripeAccounts.forEach(account => {
        account.propertyIds.forEach((propertyId: any) => {
          propertyToStripeMap.set(propertyId._id.toString(), {
            _id: account._id,
            name: account.name,
            description: account.description,
            stripeAccountId: account.stripeAccountId,
            isActive: account.isActive,
            isVerified: account.isVerified,
            businessName: account.businessName,
            businessEmail: account.businessEmail,
            isGlobalAccount: account.isGlobalAccount,
            isDefaultAccount: account.isDefaultAccount,
            accountType: "PROPERTY_SPECIFIC",
          });
        });
      });

      // Transform the data to include available Stripe accounts
      const propertiesWithAvailableStripe = properties.map(property => {
        const propertyObj = property.toObject() as any;

        // Property-specific account
        const propertyStripeAccount =
          propertyToStripeMap.get(propertyObj._id.toString()) || null;

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
      const properties = await Properties.find({ isDeleted: false })
        .populate("totalSpots", "status")
        .populate("availableSpots", "status")
        .sort({ createdAt: -1 });

      // Get all Stripe accounts with their property assignments
      const { StripeAccounts } = await import(
        "../stripe/stripe-accounts.schema"
      );
      const stripeAccounts = await StripeAccounts.find({ isDeleted: false })
        .populate("propertyIds", "name address")
        .select("propertyIds");

      // Create a set of property IDs that have Stripe accounts
      const propertiesWithStripe = new Set();
      stripeAccounts.forEach(account => {
        account.propertyIds.forEach((propertyId: any) => {
          propertiesWithStripe.add(propertyId._id.toString());
        });
      });

      // Filter properties that don't have Stripe accounts
      const propertiesWithoutStripe = properties
        .filter(
          property =>
            !propertiesWithStripe.has((property as any)._id.toString()),
        )
        .map(property => {
          const propertyObj = property.toObject() as any;

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
