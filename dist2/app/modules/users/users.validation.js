"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidation = exports.getUserAnnouncementsValidationSchema = exports.deleteUserValidationSchema = exports.updateUserInfoValidationSchema = exports.setPasswordValidationSchema = exports.createUserValidationSchema = void 0;
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
exports.UserValidation = {
    usersZodSchema,
    loginUserZodSchema,
    userUpdateZodSchema,
    updatePasswordZodSchema,
    setPasswordValidationSchema: exports.setPasswordValidationSchema,
    updateUserInfoValidationSchema: exports.updateUserInfoValidationSchema,
    deleteUserValidationSchema: exports.deleteUserValidationSchema,
    getUserAnnouncementsValidationSchema: exports.getUserAnnouncementsValidationSchema,
};
