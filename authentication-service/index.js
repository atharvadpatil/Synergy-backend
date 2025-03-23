const express = require("express");
const passport = require("passport");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const cookieParser = require("cookie-parser");

dotenv.config();


// Connect to MongoDB
connectDB();

//Initialize app
const PORT = 3001;
const app = express();

//Middleware
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost"], // Allow frontend to access backend
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Allow cookies and authorization headers
}));

app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);


//start the server
app.listen(PORT, () => {
    console.log(`Authentication Service is running on http://localhost:${PORT}`);
});
