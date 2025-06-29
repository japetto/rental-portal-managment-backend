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

  const token = jwt.sign(payload, secret, {
    expiresIn: expireTime,
  } as SignOptions);

  return token;
};

const jwtVerify = (token: string, secret: Secret): JwtPayload => {
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  try {
    console.log("🚀 ~ secret:", secret);
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    console.log("🚀 ~ error:", error);
    throw error;
  }
};

export const jwtHelpers = {
  createToken,
  jwtVerify,
};
