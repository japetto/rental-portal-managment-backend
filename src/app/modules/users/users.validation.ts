import { z } from "zod";
import { LinkedProvidersEnums, UserRoleEnums } from "./user.constant";

const usersZodSchema = z.object({
  body: z.object({
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
});

const checkUserForProviderLoginValidation = z.object({
  body: z.object({
    authMethod: z.enum([...LinkedProvidersEnums] as [string, ...string[]], {
      required_error: "Unknown Auth Method",
    }),
    email: z.string({
      required_error: "Email is Required",
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
    authMethod: z.enum([...LinkedProvidersEnums] as [string, ...string[]], {
      required_error: "Unknown Auth Method",
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

export const UserValidation = {
  usersZodSchema,
  loginUserZodSchema,
  checkUserForProviderLoginValidation,
  providerLoginZodSchema,
  userUpdateZodSchema,
  updatePasswordZodSchema,
};
