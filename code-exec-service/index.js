const express = require('express');
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();


//Initialize app
const PORT = process.env.CODE_EXEC_SERVICE_PORT || 3003;
const app = express();


//Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }))


app.listen(PORT, ()=>{
    console.log(`Code Execution Service is running on http://localhost:${PORT}`);
})