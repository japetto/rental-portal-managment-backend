import { Types } from "mongoose";
import { Spots } from "../spots/spots.schema";
import {
  IProperty,
  IPropertyWithAvailableStripe,
  IPropertyWithStripeSummary,
  IStripeAccountSummary,
} from "./properties.interface";
import { Properties } from "./properties.schema";

type StripeAccountWithPropertyIdsLean = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  isVerified: boolean;
  isDefaultAccount: boolean;
  propertyIds: Array<{ _id: Types.ObjectId }>;
};

// Helper function to calculate lot data for a property
export const calculatePropertyLotData = async (propertyId: string) => {
  const totalSpots = await Spots.countDocuments({ propertyId });
  const availableSpots = await Spots.countDocuments({
    propertyId,
    status: "AVAILABLE",
  });
  const maintenanceSpots = await Spots.countDocuments({
    propertyId,
    status: "MAINTENANCE",
  });

  return {
    totalSpots,
    availableSpots,
    maintenanceSpots,
  };
};

// Helper function to add lot data to property object
export const addLotDataToProperty = async (
  property: IProperty,
): Promise<IProperty> => {
  // Keeping the original document shape for compatibility across modules
  // Lot data is computed ad-hoc where needed using calculatePropertyLotData
  return property;
};

// Helper function to add lot data to multiple properties
export const addLotDataToProperties = async (properties: IProperty[]) => {
  // Preserve original docs; other services rely on Document methods
  return properties;
};

// Fetch all properties and join with their Stripe details
export const getAllPropertiesWithStripeDetailsService = async (): Promise<
  IPropertyWithStripeSummary[]
> => {
  const properties = await Properties.find({ isDeleted: false })
    .populate("totalSpots", "status")
    .populate("availableSpots", "status")
    .sort({ createdAt: -1 });

  const { StripeAccounts } = await import("../stripe/stripe.schema");
  const stripeAccounts = await StripeAccounts.find({ isDeleted: false })
    .populate("propertyIds", "name address")
    .select(
      "name description stripeAccountId isActive isVerified isGlobalAccount isDefaultAccount propertyIds",
    )
    .lean<StripeAccountWithPropertyIdsLean[]>();

  const propertyToStripeMap = new Map<string, IStripeAccountSummary>();

  stripeAccounts.forEach(account => {
    const summary: IStripeAccountSummary = {
      _id: account._id.toString(),
      name: account.name,
      description: account.description,
      isActive: account.isActive,
      isVerified: account.isVerified,
      isDefaultAccount: account.isDefaultAccount,
    };
    (account.propertyIds || []).forEach(propertyId => {
      propertyToStripeMap.set(propertyId._id.toString(), summary);
    });
  });

  const results: IPropertyWithStripeSummary[] = [];
  for (const prop of properties) {
    const id = (prop._id as Types.ObjectId).toString();
    const lotData = await calculatePropertyLotData(id);
    const base = prop.toObject();
    const stripeAccount = propertyToStripeMap.get(id) || null;
    results.push({
      _id: id,
      name: base.name,
      description: base.description,
      address: base.address,
      amenities: base.amenities,
      images: base.images,
      rules: base.rules,
      isActive: base.isActive,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      ...lotData,
      stripeAccount,
      hasStripeAccount: Boolean(stripeAccount),
    });
  }
  return results;
};

// Fetch properties with available Stripe accounts
export const getPropertiesWithAvailableStripeAccountsService =
  async (): Promise<IPropertyWithAvailableStripe[]> => {
    const properties = await Properties.find({ isDeleted: false })
      .populate("totalSpots", "status")
      .populate("availableSpots", "status")
      .sort({ createdAt: -1 });

    const { StripeAccounts } = await import("../stripe/stripe.schema");
    const stripeAccounts = await StripeAccounts.find({ isDeleted: false })
      .populate("propertyIds", "name address")
      .select(
        "name description stripeAccountId isActive isVerified isGlobalAccount isDefaultAccount propertyIds",
      )
      .lean<StripeAccountWithPropertyIdsLean[]>();

    const globalAccountsRaw = await StripeAccounts.find({
      isGlobalAccount: true,
      isActive: true,
      isVerified: true,
      isDeleted: false,
    })
      .select("name description isDefaultAccount")
      .lean<
        Array<{
          _id: Types.ObjectId;
          name: string;
          description?: string;
          isDefaultAccount: boolean;
        }>
      >();

    const globalAccounts: IStripeAccountSummary[] = globalAccountsRaw.map(
      acc => ({
        _id: acc._id.toString(),
        name: acc.name,
        description: acc.description,
        isActive: true,
        isVerified: true,
        isDefaultAccount: Boolean(acc.isDefaultAccount),
      }),
    );

    const propertyToStripeMap = new Map<string, IStripeAccountSummary>();

    stripeAccounts.forEach(account => {
      const summary: IStripeAccountSummary = {
        _id: account._id.toString(),
        name: account.name,
        description: account.description,
        isActive: account.isActive,
        isVerified: account.isVerified,
        isDefaultAccount: account.isDefaultAccount,
      };
      (account.propertyIds || []).forEach(propertyId => {
        propertyToStripeMap.set(propertyId._id.toString(), summary);
      });
    });

    const results: IPropertyWithAvailableStripe[] = [];
    for (const prop of properties) {
      const id = (prop._id as Types.ObjectId).toString();
      const lotData = await calculatePropertyLotData(id);
      const base = prop.toObject();
      const propertyStripeAccount = propertyToStripeMap.get(id) || null;
      const availableStripeAccounts = {
        propertySpecific: propertyStripeAccount,
        globalAccounts,
        hasPropertySpecific: Boolean(propertyStripeAccount),
        hasGlobalAccounts: globalAccounts.length > 0,
        totalAvailableAccounts:
          (propertyStripeAccount ? 1 : 0) + globalAccounts.length,
      };
      results.push({
        _id: id,
        name: base.name,
        description: base.description,
        address: base.address,
        amenities: base.amenities,
        images: base.images,
        rules: base.rules,
        isActive: base.isActive,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt,
        ...lotData,
        stripeAccount: propertyStripeAccount,
        availableStripeAccounts,
      });
    }
    return results;
  };

// Fetch properties without any Stripe account assigned
export const getPropertiesWithoutStripeAccountsService = async (): Promise<
  IPropertyWithStripeSummary[]
> => {
  const properties = await Properties.find({ isDeleted: false })
    .populate("totalSpots", "status")
    .populate("availableSpots", "status")
    .sort({ createdAt: -1 });

  const { StripeAccounts } = await import("../stripe/stripe.schema");
  const stripeAccounts = await StripeAccounts.find({ isDeleted: false })
    .populate("propertyIds", "name address")
    .select("propertyIds")
    .lean<Array<{ propertyIds: Array<{ _id: Types.ObjectId }> }>>();

  const propertiesWithStripe = new Set<string>();
  stripeAccounts.forEach(account => {
    (account.propertyIds || []).forEach(propertyId => {
      propertiesWithStripe.add(propertyId._id.toString());
    });
  });

  const results: IPropertyWithStripeSummary[] = [];
  for (const prop of properties) {
    const id = (prop._id as Types.ObjectId).toString();
    if (propertiesWithStripe.has(id)) continue;
    const lotData = await calculatePropertyLotData(id);
    const base = prop.toObject();
    results.push({
      _id: id,
      name: base.name,
      description: base.description,
      address: base.address,
      amenities: base.amenities,
      images: base.images,
      rules: base.rules,
      isActive: base.isActive,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      ...lotData,
      stripeAccount: null,
      hasStripeAccount: false,
    });
  }
  return results;
};
