import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";

const createToken = (
  payload: object,
  secret: Secret,
  expireTime: string,
): string => {
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!expireTime) {
    throw new Error("JWT_EXPIRES_IN is not configured");
  }

  return jwt.sign(payload, secret, {
    expiresIn: expireTime,
  } as SignOptions);
};

const jwtVerify = (token: string, secret: Secret): JwtPayload => {
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    throw error;
  }
};

export const jwtHelpers = {
  createToken,
  jwtVerify,
};
