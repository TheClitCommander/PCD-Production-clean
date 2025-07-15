// backend/server.ts
const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

// Import routes
const newLeadRouter = require("./api/new-lead");
const appointmentWebhookRouter = require("./api/appointment-webhook");

// Import DB initialization
const { getDB } = require("./services/db");

// Initialize the app
const app = express();
const PORT = process.env.PORT || 5173;

// Initialize the database connection
(async () => {
  try {
    await getDB();
    console.log("Database connection established");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/new-lead", newLeadRouter);
app.use("/api/appointment-webhook", appointmentWebhookRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test endpoint to verify server is running
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "WebsiteWizard API is running!" });
});

// Catch-all for API routes that don't exist
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Serve static files from the client/dist directory if it exists
app.use(express.static(path.join(__dirname, "..", "client", "dist")));

// For any other route, serve the frontend (client-side routing)
app.get("*", async (req, res) => {
  try {
    const indexPath = path.join(__dirname, "..", "client", "dist", "index.html");
    
    // Check if index.html exists
    try {
      await fs.access(indexPath);
      res.sendFile(indexPath);
    } catch (error) {
      // If no client build exists, send a helpful message
      res.status(200).send(`
        <html>
          <head><title>Pleasant Cove Design - API Server</title></head>
          <body>
            <h1>Pleasant Cove Design API Server</h1>
            <p>The API server is running. Frontend not available.</p>
            <p>API endpoints:</p>
            <ul>
              <li><code>/api/new-lead</code> - Webhook for Squarespace forms</li>
              <li><code>/api/appointment-webhook</code> - Webhook for Acuity scheduling</li>
              <li><code>/api/health</code> - Health check endpoint</li>
            </ul>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error("Error serving index.html:", error);
    res.status(500).send("Server error");
  }
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`💻 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`📝 Webhook logs will be saved to webhook.log`);
});

module.exports = app;
