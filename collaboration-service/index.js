const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const validateToken = require("./middlewares/validateToken");
const colabRoutes = require('./routes/colab');
dotenv.config();

// Connect to MongoDB
connectDB();

//Initialize app
const PORT = process.env.COLAB_SERVICE_PORT || 3002;
const app = express();

//Middleware
app.use(cors());
app.use(express.json());
app.use(validateToken);
app.use(express.urlencoded({ extended: true }))

app.use('/api/colab/workspace', colabRoutes);


//start the server
app.listen(PORT, () => {
    console.log(`Collaboration Service is running on http://localhost:${PORT}`);
});