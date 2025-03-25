const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const validateToken = require("./middlewares/validateToken");

dotenv.config();

// Connect to MongoDB
connectDB();

//Initialize app
const PORT = 3002;
const app = express();

//Middleware
app.use(cors());
app.use(express.json());
app.use(validateToken);



//start the server
app.listen(PORT, () => {
    console.log(`Authentication Service is running on http://localhost:${PORT}`);
});