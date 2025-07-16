import { Users } from "../app/modules/users/users.schema";

interface DefaultAdminData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  preferredLocation: string;
  bio?: string;
}

const defaultAdminData: DefaultAdminData = {
  name: "System Administrator",
  email: "admin@dev.com",
  password: "admin123",
  phoneNumber: "+1-555-0000",
  preferredLocation: "Main Office",
  bio: "Default system administrator created automatically.",
};

export const createDefaultAdmin = async (): Promise<void> => {
  try {
    // Check if any users exist in the system
    const userCount = await Users.countDocuments({ isDeleted: false });

    if (userCount === 0) {
      console.log(
        "🔄 No users found in the system. Creating default super admin...",
      );

      // Create the default super admin
      const adminData = {
        ...defaultAdminData,
        role: "SUPER_ADMIN" as const,
        isVerified: true,
        isInvited: false,
        isActive: true,
        isDeleted: false,
      };

      const admin = await Users.create(adminData);

      console.log("✅ Default super admin created successfully!");
      console.log(`👤 Admin Name: ${admin.name}`);
      console.log(`📧 Admin Email: ${admin.email}`);
      console.log(`🔑 Admin Password: ${defaultAdminData.password}`);
      console.log("⚠️  Please change the default password after first login!");
      console.log("🔗 Login URL: http://localhost:5000/api/v1.0/users/login");
    } else {
      console.log(
        `✅ Found ${userCount} existing user(s) in the system. Skipping default admin creation.`,
      );
    }
  } catch (error) {
    console.error("❌ Error creating default admin:", error);
    // Don't throw error to prevent server startup failure
  }
};

export const createCustomDefaultAdmin = async (
  customData: Partial<DefaultAdminData>,
): Promise<void> => {
  try {
    // Check if any users exist in the system
    const userCount = await Users.countDocuments({ isDeleted: false });

    if (userCount === 0) {
      console.log(
        "🔄 No users found in the system. Creating custom super admin...",
      );

      // Merge default data with custom data
      const adminData = {
        ...defaultAdminData,
        ...customData,
        role: "SUPER_ADMIN" as const,
        isVerified: true,
        isInvited: false,
        isActive: true,
        isDeleted: false,
      };

      const admin = await Users.create(adminData);

      console.log("✅ Custom super admin created successfully!");
      console.log(`👤 Admin Name: ${admin.name}`);
      console.log(`📧 Admin Email: ${admin.email}`);
      console.log(`🔑 Admin Password: ${adminData.password}`);
      console.log("⚠️  Please change the default password after first login!");
      console.log("🔗 Login URL: http://localhost:5000/api/v1.0/users/login");
    } else {
      console.log(
        `✅ Found ${userCount} existing user(s) in the system. Skipping custom admin creation.`,
      );
    }
  } catch (error) {
    console.error("❌ Error creating custom default admin:", error);
    // Don't throw error to prevent server startup failure
  }
};
