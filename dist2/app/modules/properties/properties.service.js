"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLotDataToProperties = exports.addLotDataToProperty = exports.calculatePropertyLotData = void 0;
const spots_schema_1 = require("../spots/spots.schema");
// Helper function to calculate lot data for a property
const calculatePropertyLotData = (propertyId) => __awaiter(void 0, void 0, void 0, function* () {
    const totalLots = yield spots_schema_1.Spots.countDocuments({ propertyId });
    const availableLots = yield spots_schema_1.Spots.countDocuments({
        propertyId,
        status: "AVAILABLE",
    });
    const maintenanceLots = yield spots_schema_1.Spots.countDocuments({
        propertyId,
        status: "MAINTENANCE",
    });
    return {
        totalLots,
        availableLots,
        maintenanceLots,
    };
});
exports.calculatePropertyLotData = calculatePropertyLotData;
// Helper function to add lot data to property object
const addLotDataToProperty = (property) => __awaiter(void 0, void 0, void 0, function* () {
    const propertyId = property._id.toString();
    const lotData = yield (0, exports.calculatePropertyLotData)(propertyId);
    const propertyObject = property.toObject();
    return Object.assign(Object.assign(Object.assign({}, propertyObject), { id: propertyObject._id }), lotData);
});
exports.addLotDataToProperty = addLotDataToProperty;
// Helper function to add lot data to multiple properties
const addLotDataToProperties = (properties) => __awaiter(void 0, void 0, void 0, function* () {
    const propertiesWithLotData = yield Promise.all(properties.map((property) => __awaiter(void 0, void 0, void 0, function* () {
        return yield (0, exports.addLotDataToProperty)(property);
    })));
    return propertiesWithLotData;
});
exports.addLotDataToProperties = addLotDataToProperties;
