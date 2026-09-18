const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), "public")));
// Routes
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes");

// Home Route
app.get("/", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);

    res.status(err.status || 500).json({
        status: "error",
        message: err.message || "Internal Server Error"
    });
});

module.exports = app;