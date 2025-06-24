import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV as string,
  port: process.env.PORT as string,
  database_url: process.env.DATABASE_URL as string,
  salt_round: process.env.SALT_ROUND as string,
  anonymous_user_uid: process.env.ANONYMOUS_USER_UID as string,
  admin_uid: process.env.ADMIN_UID as string,
  jwt_secret: process.env.JWT_SECRET as string,
  jwt_expires_in: process.env.JWT_EXPIRES_IN as string,
  redis_host: process.env.UPSTASH_REDIS_ENDPOINT as string,
  redis_password: process.env.UPSTASH_REDIS_PASSWORD as string,
  redis_port: process.env.UPSTASH_REDIS_PORT as string,
  redis_crypto_key: process.env.REDIS_CRYPTO_KEY as string,
  nodemailer_user: process.env.NODEMAILER_USER as string,
  nodemailer_pass: process.env.NODEMAILER_PASS as string,
};
