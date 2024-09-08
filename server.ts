import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import eventRoutes from "@routes/event";
import authRoutes from "@routes/auth";
import dotenv from "dotenv";
import { verifyJWT } from "@middleware/auth";

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api", verifyJWT, eventRoutes);
app.use("/auth", authRoutes);

// todo: fix
// app.use((err: any, req: Request, res: Response) => {
//   console.error(err.stack);
//   res.status(500).json({ error: "An unexpected error occurred." });
// });

if (process.env.NODE_ENV === "development") {
  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });
}

export default app;
