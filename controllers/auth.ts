import { Request, Response } from "express";
import { authenticateUser } from "../services/auth";

export const adminLogin = async (req: Request, res: Response) => {
  const { username, password, twoFactorCode } = req.body;

  if (!username || !password || !twoFactorCode) {
    return res.status(400).json({
      error: "Username, password, and 2FA twoFactorCode are required.",
    });
  }

  try {
    const { authToken } = await authenticateUser(
      username,
      password,
      twoFactorCode
    );
    res.cookie("authToken", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    return res.json({ isAdmin: true });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message });
    } else {
      return res.status(500).json({ error: "An unexpected error occurred." });
    }
  }
};
