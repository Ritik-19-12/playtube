import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import

import userRoutes from "./routes/user.routes.js";

// routes
// Mount all user-related routes under "/api/v1/user".
// We use app.use() because userRoutes contains multiple routes and HTTP methods
// (GET, POST, PUT, DELETE, etc.), not just a single GET route.

app.use("/api/v1/user", userRoutes);

export { app };
