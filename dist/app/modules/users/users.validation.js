"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidation = exports.updateEmergencyContactValidationSchema = exports.getUserAnnouncementsValidationSchema = exports.deleteUserValidationSchema = exports.updateTenantDataValidationSchema = exports.updateUserInfoValidationSchema = exports.setPasswordValidationSchema = exports.createUserValidationSchema = void 0;
const zod_1 = require("zod");
const user_constant_1 = require("./user.constant");
const usersZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({
            required_error: "Name is Required",
        }),
        email: zod_1.z.string({
            required_error: "Email is Required",
        }),
        phoneNumber: zod_1.z.string({
            required_error: "Phone Number is Required",
        }),
        password: zod_1.z.string().optional(),
        role: zod_1.z.enum([...user_constant_1.UserRoleEnums], {
            required_error: "Role is Required",
        }),
        preferredLocation: zod_1.z.string({
            required_error: "Preferred Location is Required",
        }),
    }),
});
const loginUserZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string({
            required_error: "Email is Required",
        }),
        password: zod_1.z.string({
            required_error: "Password is Required",
        }),
    }),
});
const providerLoginZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        userInfo: zod_1.z.object({
            userName: zod_1.z.string({
                required_error: "User Name is Required",
            }),
            email: zod_1.z.string({
                required_error: "Email is Required",
            }),
            contactNumber: zod_1.z.string({
                required_error: "Contact Number is Required",
            }),
            password: zod_1.z.string({
                required_error: "Password is Required",
            }),
            profileImage: zod_1.z
                .string()
                .default("https://i.ibb.co/dcHVrp8/User-Profile-PNG-Image.png"),
            role: zod_1.z.enum([...user_constant_1.UserRoleEnums], {
                required_error: "Role is Required",
            }),
            location: zod_1.z
                .object({
                street: zod_1.z.string().default("Not Updated Yet!"),
                city: zod_1.z.string().default("Not Updated Yet!"),
                district: zod_1.z.string().default("Not Updated Yet!"),
                country: zod_1.z.string().default("Not Updated Yet!"),
            })
                .default({}),
        }),
    }),
});
const userUpdateZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        userName: zod_1.z.string().optional(),
        email: zod_1.z.string().optional(),
        contactNumber: zod_1.z.string().optional(),
        password: zod_1.z.string().optional(),
        profileImage: zod_1.z.string().optional(),
        role: zod_1.z.string().optional(),
        uid: zod_1.z.string().optional(),
        location: zod_1.z
            .object({
            street: zod_1.z.string().optional(),
            city: zod_1.z.string().optional(),
            district: zod_1.z.string().optional(),
            country: zod_1.z.string().optional(),
        })
            .optional(),
    }),
});
const updatePasswordZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string({
            required_error: "Current Password is Required",
        }),
        newPassword: zod_1.z.string({
            required_error: "New Password is Required",
        }),
        confirmPassword: zod_1.z.string({
            required_error: "Confirm Password is Required",
        }),
        userId: zod_1.z.string({
            required_error: "UID is Required",
        }),
    }),
});
exports.createUserValidationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string().min(1, "Name is required"),
        email: zod_1.z.string().email("Invalid email format"),
        password: zod_1.z
            .string()
            .min(6, "Password must be at least 6 characters")
            .optional(),
        confirmPassword: zod_1.z
            .string()
            .min(6, "Confirm password must be at least 6 characters")
            .optional(),
        phoneNumber: zod_1.z.string().min(1, "Phone number is required"),
        role: zod_1.z.enum(["SUPER_ADMIN", "TENANT"]).default("TENANT"),
        preferredLocation: zod_1.z.string().min(1, "Preferred location is required"),
    })
        .refine(data => {
        // Only validate password match if both password and confirmPassword are provided
        if (data.password && data.confirmPassword) {
            return data.password === data.confirmPassword;
        }
        return true;
    }, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    }),
});
exports.setPasswordValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email format"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: zod_1.z.string().optional(),
    }),
});
exports.updateUserInfoValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        phoneNumber: zod_1.z.string().optional(),
        preferredLocation: zod_1.z.string().optional(),
        bio: zod_1.z.string().optional(),
        profileImage: zod_1.z.string().optional(),
    }),
});
exports.updateTenantDataValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        user: zod_1.z
            .object({
            name: zod_1.z.string().optional(),
            phoneNumber: zod_1.z.string().optional(),
            email: zod_1.z.string().email("Invalid email format").optional(),
            rvInfo: zod_1.z
                .object({
                make: zod_1.z.string().optional(),
                model: zod_1.z.string().optional(),
                year: zod_1.z.number().optional().nullable(),
                length: zod_1.z.number().optional().nullable(),
                licensePlate: zod_1.z.string().optional(),
            })
                .optional(),
            emergencyContact: zod_1.z
                .object({
                name: zod_1.z
                    .string()
                    .min(1, "Emergency contact name is required")
                    .optional(),
                phone: zod_1.z
                    .string()
                    .min(1, "Emergency contact phone is required")
                    .optional(),
                relationship: zod_1.z
                    .string()
                    .min(1, "Relationship is required")
                    .optional(),
            })
                .optional(),
        })
            .optional(),
        lease: zod_1.z
            .object({
            leaseType: zod_1.z.enum(["MONTHLY", "FIXED_TERM"]).optional(),
            leaseStart: zod_1.z.string().optional(), // Will be converted to Date
            leaseEnd: zod_1.z.string().optional(), // Will be converted to Date
            rentAmount: zod_1.z.number().optional(),
            additionalRentAmount: zod_1.z.number().optional(),
            depositAmount: zod_1.z.number().optional(),
            occupants: zod_1.z.number().optional(),
            pets: zod_1.z
                .object({
                hasPets: zod_1.z.boolean().optional(),
                petDetails: zod_1.z
                    .array(zod_1.z.object({
                    type: zod_1.z.string(),
                    breed: zod_1.z.string(),
                    name: zod_1.z.string(),
                    weight: zod_1.z.number(),
                }))
                    .optional(),
            })
                .optional(),
            specialRequests: zod_1.z.array(zod_1.z.string()).optional(),
            documents: zod_1.z.array(zod_1.z.string()).optional(),
            notes: zod_1.z.string().optional(),
        })
            .optional(),
    }),
});
exports.deleteUserValidationSchema = zod_1.z.object({
    params: zod_1.z.object({
        userId: zod_1.z.string().min(1, "User ID is required"),
    }),
});
exports.getUserAnnouncementsValidationSchema = zod_1.z.object({
    query: zod_1.z.object({
        propertyId: zod_1.z.string().optional(),
    }),
});
exports.updateEmergencyContactValidationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        name: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
        relationship: zod_1.z.string().optional(),
    })
        .strict(),
});
exports.UserValidation = {
    usersZodSchema,
    loginUserZodSchema,
    userUpdateZodSchema,
    updatePasswordZodSchema,
    setPasswordValidationSchema: exports.setPasswordValidationSchema,
    updateUserInfoValidationSchema: exports.updateUserInfoValidationSchema,
    updateTenantDataValidationSchema: exports.updateTenantDataValidationSchema,
    updateEmergencyContactValidationSchema: exports.updateEmergencyContactValidationSchema,
    deleteUserValidationSchema: exports.deleteUserValidationSchema,
    getUserAnnouncementsValidationSchema: exports.getUserAnnouncementsValidationSchema,
};
