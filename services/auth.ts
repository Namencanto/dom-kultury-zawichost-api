import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";

const jwtSecret = process.env.JWT_SECRET || "super-secret-key";

export const authenticateUser = async (
  username: string,
  password: string,
  token: string
) => {
  const envUsername = process.env.ADMIN_USERNAME;
  const envPassword = process.env.ADMIN_PASSWORD;
  const totpSecret = process.env.TOTP_SECRET;

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

  const authToken = jwt.sign({ username, role: "ADMIN" }, jwtSecret, {
    expiresIn: "1h",
  });

  return { authToken };
};
