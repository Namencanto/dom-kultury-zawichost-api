import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  const token =
    typeof req.headers.token === "string" ? req.headers.token : undefined;

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || "super-secret-key") as
      | string
      | JwtPayload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};
