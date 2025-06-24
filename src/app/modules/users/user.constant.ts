import {
  genderEnums,
  linkedProvidersEnums,
  userRoleEnums,
} from "./users.interface";

export const UserRoleEnums: userRoleEnums[] = ["hotelOwner", "customer"];

export const LinkedProvidersEnums: linkedProvidersEnums[] = [
  "CUSTOM",
  "FACEBOOK",
  "TWITTER",
  "GOOGLE",
];

export const GenderEnums: genderEnums[] = ["FEMALE", "MALE"];
