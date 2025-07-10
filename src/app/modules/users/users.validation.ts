import { z } from "zod";
import { UserRoleEnums } from "./user.constant";

const usersZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: "Name is Required",
    }),
    email: z.string({
      required_error: "Email is Required",
    }),
    phoneNumber: z.string({
      required_error: "Phone Number is Required",
    }),
    password: z.string().optional(),
    role: z.enum([...UserRoleEnums] as [string, ...string[]], {
      required_error: "Role is Required",
    }),
    preferredLocation: z.string({
      required_error: "Preferred Location is Required",
    }),
  }),
});

const loginUserZodSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: "Email is Required",
    }),
    password: z.string({
      required_error: "Password is Required",
    }),
  }),
});

const providerLoginZodSchema = z.object({
  body: z.object({
    userInfo: z.object({
      userName: z.string({
        required_error: "User Name is Required",
      }),
      email: z.string({
        required_error: "Email is Required",
      }),
      contactNumber: z.string({
        required_error: "Contact Number is Required",
      }),
      password: z.string({
        required_error: "Password is Required",
      }),
      profileImage: z
        .string()
        .default("https://i.ibb.co/dcHVrp8/User-Profile-PNG-Image.png"),
      role: z.enum([...UserRoleEnums] as [string, ...string[]], {
        required_error: "Role is Required",
      }),
      location: z
        .object({
          street: z.string().default("Not Updated Yet!"),
          city: z.string().default("Not Updated Yet!"),
          district: z.string().default("Not Updated Yet!"),
          country: z.string().default("Not Updated Yet!"),
        })
        .default({}),
    }),
  }),
});

const userUpdateZodSchema = z.object({
  body: z.object({
    userName: z.string().optional(),
    email: z.string().optional(),
    contactNumber: z.string().optional(),
    password: z.string().optional(),
    profileImage: z.string().optional(),
    role: z.string().optional(),
    uid: z.string().optional(),
    location: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        district: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
  }),
});

const updatePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string({
      required_error: "Current Password is Required",
    }),
    newPassword: z.string({
      required_error: "New Password is Required",
    }),
    confirmPassword: z.string({
      required_error: "Confirm Password is Required",
    }),
    userId: z.string({
      required_error: "UID is Required",
    }),
  }),
});

export const createUserValidationSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email format"),
      password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .optional(),
      confirmPassword: z
        .string()
        .min(6, "Confirm password must be at least 6 characters")
        .optional(),
      phoneNumber: z.string().min(1, "Phone number is required"),
      role: z.enum(["SUPER_ADMIN", "TENANT"]).default("TENANT"),
      preferredLocation: z.string().min(1, "Preferred location is required"),
    })
    .refine(
      data => {
        // Only validate password match if both password and confirmPassword are provided
        if (data.password && data.confirmPassword) {
          return data.password === data.confirmPassword;
        }
        return true;
      },
      {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      },
    ),
});

export const setPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().optional(),
  }),
});

export const updateUserInfoValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    preferredLocation: z.string().optional(),
    bio: z.string().optional(),
    profileImage: z.string().optional(),
    emergencyContact: z
      .object({
        name: z.string().min(1, "Emergency contact name is required"),
        phone: z.string().min(1, "Emergency contact phone is required"),
        relationship: z
          .string()
          .min(1, "Emergency contact relationship is required"),
      })
      .optional(),
    specialRequests: z.array(z.string()).optional(),
  }),
});

export const deleteUserValidationSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});

export const getUserAnnouncementsValidationSchema = z.object({
  query: z.object({
    propertyId: z.string().optional(),
  }),
});

export const UserValidation = {
  usersZodSchema,
  loginUserZodSchema,
  userUpdateZodSchema,
  updatePasswordZodSchema,
  setPasswordValidationSchema,
  updateUserInfoValidationSchema,
  deleteUserValidationSchema,
  getUserAnnouncementsValidationSchema,
};
