// Vercel serverless function entry point
const mongoose = require("mongoose");
const app = require("../dist/app.js");

// Import the createDefaultAdmin function
const { createDefaultAdmin } = require("../dist/shared/createDefaultAdmin.js");

// Database connection for serverless environment
const connectDB = async () => {
  try {
    const uri = process.env.DATABASE_URL;
    if (!uri) {
      console.error("DATABASE_URL is not defined");
      return;
    }

    await mongoose.connect(uri);
    console.log("🛢 Database Connected Successfully");

    // Create default admin if needed
    await createDefaultAdmin();
  } catch (error) {
    console.error("Database connection error:", error);
  }
};

// Connect to database when the function is invoked
connectDB();

// Handle port for local development vs serverless
const port = process.env.PORT || 5000;

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

// Export the Express app for Vercel
module.exports = app;
