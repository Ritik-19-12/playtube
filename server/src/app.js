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
import videoRoutes from "./routes/video.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import commentRouter from "./routes/comment.routes.js";

// routes
// Mount all user-related routes under "/api/v1/user".
// We use app.use() because userRoutes contains multiple routes and HTTP methods
// (GET, POST, PUT, DELETE, etc.), not just a single GET route.

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/video", videoRoutes);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/comments", commentRouter);

export { app };
