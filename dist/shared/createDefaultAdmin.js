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
exports.createCustomDefaultAdmin = exports.createDefaultAdmin = void 0;
const users_schema_1 = require("../app/modules/users/users.schema");
const defaultAdminData = {
    name: "System Administrator",
    email: "admin@dev.com",
    password: "admin123",
    phoneNumber: "+1-555-0000",
    preferredLocation: "Main Office",
    bio: "Default system administrator created automatically.",
};
const createDefaultAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if any users exist in the system
        const userCount = yield users_schema_1.Users.countDocuments({ isDeleted: false });
        if (userCount === 0) {
            console.log("🔄 No users found in the system. Creating default super admin...");
            // Create the default super admin
            const adminData = Object.assign(Object.assign({}, defaultAdminData), { role: "SUPER_ADMIN", isVerified: true, isInvited: false, isActive: true, isDeleted: false });
            const admin = yield users_schema_1.Users.create(adminData);
            console.log("✅ Default super admin created successfully!");
            console.log(`👤 Admin Name: ${admin.name}`);
            console.log(`📧 Admin Email: ${admin.email}`);
            console.log(`🔑 Admin Password: ${defaultAdminData.password}`);
            console.log("⚠️  Please change the default password after first login!");
            console.log("🔗 Login URL: http://localhost:5000/api/v1.0/users/login");
        }
        else {
            console.log(`✅ Found ${userCount} existing user(s) in the system. Skipping default admin creation.`);
        }
    }
    catch (error) {
        console.error("❌ Error creating default admin:", error);
        // Don't throw error to prevent server startup failure
    }
});
exports.createDefaultAdmin = createDefaultAdmin;
const createCustomDefaultAdmin = (customData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if any users exist in the system
        const userCount = yield users_schema_1.Users.countDocuments({ isDeleted: false });
        if (userCount === 0) {
            console.log("🔄 No users found in the system. Creating custom super admin...");
            // Merge default data with custom data
            const adminData = Object.assign(Object.assign(Object.assign({}, defaultAdminData), customData), { role: "SUPER_ADMIN", isVerified: true, isInvited: false, isActive: true, isDeleted: false });
            const admin = yield users_schema_1.Users.create(adminData);
            console.log("✅ Custom super admin created successfully!");
            console.log(`👤 Admin Name: ${admin.name}`);
            console.log(`📧 Admin Email: ${admin.email}`);
            console.log(`🔑 Admin Password: ${adminData.password}`);
            console.log("⚠️  Please change the default password after first login!");
            console.log("🔗 Login URL: http://localhost:5000/api/v1.0/users/login");
        }
        else {
            console.log(`✅ Found ${userCount} existing user(s) in the system. Skipping custom admin creation.`);
        }
    }
    catch (error) {
        console.error("❌ Error creating custom default admin:", error);
        // Don't throw error to prevent server startup failure
    }
});
exports.createCustomDefaultAdmin = createCustomDefaultAdmin;
