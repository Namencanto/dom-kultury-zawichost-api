import dotenv from "dotenv";
dotenv.config();

const requiredEnvVars = [
  "GITHUB_OWNER",
  "GITHUB_REPO",
  "GITHUB_TOKEN",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "JWT_SECRET",
  "TOTP_SECRET",
  "NODE_ENV",
];

const checkEnvVars = () => {
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
  if (missingVars.length > 0) {
    throw new Error(
      `The following required environment variables are missing: ${missingVars.join(
        ", "
      )}`
    );
  }
};

checkEnvVars();

export default {
  GITHUB_OWNER: process.env.GITHUB_OWNER,
  GITHUB_REPO: process.env.GITHUB_REPO,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  TOTP_SECRET: process.env.TOTP_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};
