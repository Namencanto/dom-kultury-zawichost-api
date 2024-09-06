import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import eventRoutes from "./routes/event";
import authRoutes from "./routes/auth";
import dotenv from "dotenv";
import { verifyJWT } from "./middleware/auth";

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api", verifyJWT, eventRoutes);
app.use("/auth", authRoutes);

if (process.env.NODE_ENV === "development") {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
