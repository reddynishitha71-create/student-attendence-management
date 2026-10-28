
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config({
    path: path.join(__dirname, ".env")
});

const supabase = require("./supabase");
const studentRoutes = require("./routes/students");
const attendanceRoutes = require("./routes/attendance");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");

app.use(helmet());

app.use(express.json({ limit: "100kb" }));

// Basic protection against excessive API requests.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false
});

app.use("/api", apiLimiter);

// Serve the frontend folder.
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Health check.
app.get("/api/health", async (req, res) => {
    try {
        const { error } = await supabase
            .from("students")
            .select("id")
            .limit(1);

        if (error) {
            return res.status(503).json({
                status: "error",
                message: "Database connection check failed."
            });
        }

        res.json({
            status: "ok",
            message: "Backend and database are connected."
        });
    } catch {
        res.status(503).json({
            status: "error",
            message: "Database is currently unavailable."
        });
    }
});

// API routes.
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

// Unknown API endpoints.
app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API endpoint not found."
    });
});

// Handle invalid JSON and unexpected errors.
app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({
            error: "Invalid JSON request body."
        });
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            error: "Request body is too large."
        });
    }

    console.error("Request failed:", error.message);

    res.status(500).json({
        error: "An internal server error occurred."
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});