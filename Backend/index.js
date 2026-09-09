require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { initSockets } = require("./sockets");
const prisma = require("./db/prisma");
const limiter = require("./middleware/rateLimitMiddleware");
const securityHeaders = require("./middleware/securityHeaders");
const cacheHeaders = require("./middleware/cacheHeaders");
const auditActivity = require("./middleware/activityMiddleware");
const { middleware: requestMetrics } = require("./middleware/requestMetrics");
const { withIds } = require("./utils/serializeIds");

const app = express();
const port = process.env.PORT || 5000;

// ── Hardening ───────────────────────────────────────────────
app.disable("x-powered-by"); // don't advertise Express
// Escape < > & etc. in JSON responses — cheap XSS-in-JSON mitigation.
app.set("json escape", true);
// Weak ETags on JSON so repeat public GETs can answer 304 (see middleware/cacheHeaders).
app.set("etag", "weak");

// Behind a reverse proxy (Render) the rate limiter + req.ip need the real
// client IP. Only trust one hop, and only in production.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(securityHeaders);
app.use(cacheHeaders);
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

// Public liveness probe — no auth, no DB, no heavy work.
// Mounted BEFORE the rate limiter / audit / metrics consumers so an external
// keep-alive (e.g. every 10 min on Render Free Tier) never burns quota or
// writes ActivityLog rows. Distinct from the admin /api/admin/health checks.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Request metrics — mounted BEFORE the rate limiter so 429 responses are
// observed too. Powers the admin "System Health" dashboards with real data.
app.use(requestMetrics);

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
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);
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
const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);
const aiRoutes = require("./routes/aiRoutes");
app.use("/api/ai", aiRoutes);
const securityRoutes = require("./routes/securityRoutes");
app.use("/api/security", securityRoutes);
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
const contactRoutes = require("./routes/contactRoutes");
app.use("/api/contact", contactRoutes);

// Global error handler
app.use(errorHandler);
// Placeholder route
app.get("/", (req, res) => {
  res.send("Backend is working and ready for development.");
});

// Wrapped in an HTTP server so Socket.IO can attach for notification pushes.
const server = http.createServer(app);
initSockets(server);
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
