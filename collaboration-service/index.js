const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const validateToken = require("./middlewares/validateToken");
const colabRoutes = require('./routes/colab');
dotenv.config();

const http = require('http');
const { WebSocket } = require('ws');
const { setupWSConnection, getYDoc } = require('@y/websocket-server/utils');
const Workspace = require('./models/workspace');
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

const activeDocuments = new Map();

async function saveSnapshot(docName, ydoc) {
    try {
        console.log(`Saving snapshot for document: ${docName}`);

        const workspace = await Workspace.findOne({ uniqueLink: docName });
        if (!workspace) {
            console.error('Workspace not found:', docName);
            return;
        }

        let updateObj = {};
        
        const codeMap = ydoc.getMap('code');
        const drawingMap = ydoc.getMap('drawing');

        const codeContent = codeMap.get('content')?.toString() || '';
        const language = codeMap.get('language')?.toString() || 'C++';
        const input = codeMap.get('input')?.toString() || '';
        const output = codeMap.get('output')?.toString() || '';

        const rectangles = drawingMap.get('rectangles')?.toArray() || [];
        const scribbles = drawingMap.get('scribbles')?.toArray() || [];
        const lines = drawingMap.get('lines')?.toArray() || [];
        const circles = drawingMap.get('circles')?.toArray() || [];
        const arrows = drawingMap.get('arrows')?.toArray() || [];

        updateObj = {
            'codeSnapshot.content': codeContent,
            'codeSnapshot.language': language,
            'codeSnapshot.input': input,
            'codeSnapshot.output': output,
            'drawingSnapshot.rectangles': rectangles,
            'drawingSnapshot.scribbles': scribbles,
            'drawingSnapshot.lines': lines,
            'drawingSnapshot.circles': circles,
            'drawingSnapshot.arrows': arrows
        };
        
        await Workspace.findOneAndUpdate(
            { uniqueLink: docName },
            { $set: updateObj },
            { new: true }
        );

        console.log(`Snapshot saved successfully for ${docName}`);
    } catch (error) {
        console.error('Error saving snapshot:', error);
    }
}

const wss = new WebSocket.Server({server});
wss.on('connection', (conn, req)=>{
    const docName = req.url.slice(11);
    setupWSConnection(conn, req, {docName: docName});

    const [workspaceId, docType] = docName.split('-');

    if(docType !== 'notes'){
        const ydoc = getYDoc(docName);
        console.log(`YJS document ready: ${docName}`); 
        
        activeDocuments.set(docName, ydoc);

        conn.on('close', () => {
            console.log(`WebSocket connection closed for document: ${docName}`);
            
            // Save final snapshot before cleanup
            const ydoc = activeDocuments.get(docName);
            if (ydoc) {
                saveSnapshot(docName, ydoc);
            }
            activeDocuments.delete(docName);
        });
    }
});


//start the server
server.listen(PORT, () => {
    console.log(`Collaboration Service is running on http://localhost:${PORT}`);
});