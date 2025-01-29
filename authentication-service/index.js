const express = require("express");
const passport = require("passport");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

//Initialize app
const PORT = 3001;
const app = express();

//Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());



//start the server
app.listen(PORT, () => {
    console.log(`Authentication Service is running on http://localhost:${PORT}`);
});
