const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const validateToken = require("./middlewares/validateToken");
const colabRoutes = require('./routes/colab');
dotenv.config();

const http = require('http');
const { WebSocket } = require('ws');
const { setupWSConnection } = require('@y/websocket-server/utils');

// Connect to MongoDB
connectDB();

//Initialize app
const PORT = process.env.COLAB_SERVICE_PORT || 3002;
const app = express();
const server = http.createServer(app);

//Middleware
app.use(cors());
app.use(express.json());
app.use(validateToken);
app.use(express.urlencoded({ extended: true }))

app.use('/api/colab/workspace', colabRoutes);


// websocket server with yjs
const wss = new WebSocket.Server({server});
wss.on('connection', (conn, req)=>{
    setupWSConnection(conn, req, { docName: req.url.slice(11) })
})


//start the server
server.listen(PORT, () => {
    console.log(`Collaboration Service is running on http://localhost:${PORT}`);
});