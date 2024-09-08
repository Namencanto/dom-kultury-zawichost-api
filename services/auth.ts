import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import config from "@config";

export const authenticateUser = async (
  username: string,
  password: string,
  token: string
) => {
  const envUsername = config.ADMIN_USERNAME;
  const envPassword = config.ADMIN_PASSWORD;
  const totpSecret = config.TOTP_SECRET;

  if (!envUsername || !envPassword || !totpSecret) {
    throw new Error("Server configuration is missing.");
  }

  if (username !== envUsername) {
    throw new Error("Invalid credentials.");
  }

  const isPasswordValid = await bcrypt.compare(password, envPassword);
  if (!isPasswordValid) {
    throw new Error("Invalid credentials.");
  }

  const verified = speakeasy.totp.verify({
    secret: totpSecret,
    encoding: "base32",
    token,
  });

  if (!verified) {
    throw new Error("Invalid 2FA token.");
  }

  const authToken = jwt.sign({ username, role: "ADMIN" }, config.JWT_SECRET, {
    expiresIn: "1h",
  });

  return { authToken };
};
