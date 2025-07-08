import { Spots } from "../spots/spots.schema";
import { IProperty } from "./properties.interface";

// Helper function to calculate lot data for a property
export const calculatePropertyLotData = async (propertyId: string) => {
  const totalLots = await Spots.countDocuments({ propertyId });
  const availableLots = await Spots.countDocuments({
    propertyId,
    status: "AVAILABLE",
  });
  const maintenanceLots = await Spots.countDocuments({
    propertyId,
    status: "MAINTENANCE",
  });

  return {
    totalLots,
    availableLots,
    maintenanceLots,
  };
};

// Helper function to add lot data to property object
export const addLotDataToProperty = async (property: IProperty) => {
  const propertyId = (property._id as any).toString();
  const lotData = await calculatePropertyLotData(propertyId);

  const propertyObject = property.toObject();

  return {
    ...propertyObject,
    id: propertyObject._id,
    ...lotData,
  };
};

// Helper function to add lot data to multiple properties
export const addLotDataToProperties = async (properties: IProperty[]) => {
  const propertiesWithLotData = await Promise.all(
    properties.map(async property => {
      return await addLotDataToProperty(property);
    }),
  );

  return propertiesWithLotData;
};
