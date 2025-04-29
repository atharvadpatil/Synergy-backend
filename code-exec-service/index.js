const express = require('express');
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const validateToken = require('./middlewares/validateToken');
const axios = require('axios');


//Initialize app
const PORT = process.env.CODE_EXEC_SERVICE_PORT || 3003;
const app = express();


//Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(validateToken);


app.use('/api/code/execute', async (req, res)=>{
    const { language, code, input } = req.body;

    if(!language || !code) {
        return res.status(400).json({success: false, message: "Language and code are required"})
    }

    try {
        let body = {
          language,
          code,
          input
        }
        body = JSON.stringify(body);
        const response = await axios.post('http://localhost:9000/2015-03-31/functions/function/invocations', {
          body: body
        })
        res.json(response.data);
    } catch (error) {
        console.error(`Execution error: ${error.message}`);
        res.status(500).json({ success:false, message: error.message });
    }
})

app.listen(PORT, ()=>{
    console.log(`Code Execution Service is running on http://localhost:${PORT}`);
})