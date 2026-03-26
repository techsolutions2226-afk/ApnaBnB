require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const limiter = require("./middleware/rateLimitMiddleware");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(limiter); // Apply rate limiting globally

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connection established successfully"))
  .catch((error) => console.error("MongoDB connection failed:", error.message));

// Routes
const authRoutes = require("./routes/authRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
const listingRoutes = require("./routes/listingRoutes");
app.use("/api/listings", listingRoutes);
const requirementRoutes = require("./routes/requirementRoutes");
app.use("/api/requirements", requirementRoutes);
const matchRoutes = require("./routes/matchRoutes");
app.use("/api/matches", matchRoutes);
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);
const adminRoutes = require("./routes/adminRoutes");
const errorHandler = require("./middleware/errorMiddleware");
app.use("/api/admin", adminRoutes);

// Global error handler
app.use(errorHandler);
// Placeholder route
app.get("/", (req, res) => {
  res.send("Backend is working and ready for development.");
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
