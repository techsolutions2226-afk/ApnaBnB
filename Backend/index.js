require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const prisma = require("./db/prisma");
const limiter = require("./middleware/rateLimitMiddleware");
const securityHeaders = require("./middleware/securityHeaders");
const auditActivity = require("./middleware/activityMiddleware");
const { withIds } = require("./utils/serializeIds");
const { initSockets } = require("./sockets");

const app = express();
const port = process.env.PORT || 5000;

// ── Hardening ───────────────────────────────────────────────
app.disable("x-powered-by"); // don't advertise Express
// Escape < > & etc. in JSON responses — cheap XSS-in-JSON mitigation.
app.set("json escape", true);

// Behind a reverse proxy (Render) the rate limiter + req.ip need the real
// client IP. Only trust one hop, and only in production.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(securityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// CORS configuration — whitelist frontend URL for production
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(limiter); // Apply rate limiting globally

// Add `_id` (= id) to every object in every JSON response — top level and
// nested — so responses match the shape the frontend expects post-migration.
app.use((req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => json(withIds(body));
  next();
});

// Audit trail — one ActivityLog row per successful mutating API action.
// Mounted globally (works without touching any controller); reads req.user
// lazily at response-finish time so auth middleware has already run.
app.use(auditActivity);

// Postgres (Supabase) connection via Prisma.
prisma
  .$connect()
  .then(() => console.log("Postgres connection established successfully"))
  .catch((error) => console.error("Postgres connection failed:", error.message));

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
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
const blockRoutes = require("./routes/blockRoutes");
app.use("/api/blocks", blockRoutes);
const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);
const adminRoutes = require("./routes/adminRoutes");
const errorHandler = require("./middleware/errorMiddleware");
app.use("/api/admin", adminRoutes);
const uploadRoutes = require("./routes/uploadRoutes");
app.use("/api/upload", uploadRoutes);
const tripRoutes = require("./routes/tripRoutes");
app.use("/api/trips", tripRoutes);
const wishlistRoutes = require("./routes/wishlistRoutes");
app.use("/api/wishlists", wishlistRoutes);
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);
const planRoutes = require("./routes/planRoutes");
app.use("/api/plans", planRoutes);

// Global error handler
app.use(errorHandler);
// Placeholder route
app.get("/", (req, res) => {
  res.send("Backend is working and ready for development.");
});

// Start server — wrap Express in an HTTP server so Socket.IO can attach.
const server = http.createServer(app);
initSockets(server);
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Socket.IO attached on the same port`);
});
