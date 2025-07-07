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
const Y = require('yjs');
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

async function saveNotesSnapshot(workspaceId, ydoc){
    try {
        console.log(`Saving snapshot for document: ${workspaceId}-notes`);
        const workspace = await Workspace.findOne({ uniqueLink: workspaceId });
        if (!workspace) {
            console.error('Workspace not found:', `${workspaceId}-notes`);
            return;
        }

        const update = Y.encodeStateAsUpdate(ydoc);

        let updateObj = {};

        updateObj = {
            'notesSnapshot.content': Buffer.from(update)
        }

        await Workspace.findOneAndUpdate(
            { uniqueLink: workspaceId },
            { $set: updateObj },
            { new: true }
        );
        console.log(`Snapshot saved successfully for ${workspaceId}-notes`);  
    } catch (error) {
        console.error('Error saving snapshot:', error);
    }
    
} 

function updateYjs(ydoc, type, key, value){
    ydoc.getMap(type).get(key).delete(0, ydoc.getMap(type).get(key).length);
    ydoc.getMap(type).get(key).insert(0, value);
}

async function updateYDocFromDB(docName, ydoc) {
    const workspace = await Workspace.findOne({ uniqueLink: docName });
    if (!workspace) {
        console.error('Workspace not found:', docName);
        return;
    }
    updateYjs(ydoc, 'code', 'content', workspace.codeSnapshot.content);
    updateYjs(ydoc, 'code', 'language', workspace.codeSnapshot.language);
    updateYjs(ydoc, 'code', 'input', workspace.codeSnapshot.input);
    updateYjs(ydoc, 'code', 'output', workspace.codeSnapshot.output);

    updateYjs(ydoc, 'drawing', 'rectangles', workspace.drawingSnapshot.rectangles);
    updateYjs(ydoc, 'drawing', 'scribbles', workspace.drawingSnapshot.scribbles);
    updateYjs(ydoc, 'drawing', 'lines', workspace.drawingSnapshot.lines);
    updateYjs(ydoc, 'drawing', 'circles', workspace.drawingSnapshot.circles);
    updateYjs(ydoc, 'drawing', 'arrows', workspace.drawingSnapshot.arrows);
}

async function updateNoteYDocFromDB(workspaceId, ydoc) {
    const workspace = await Workspace.findOne({ uniqueLink: workspaceId });
    if (!workspace) {
        console.error('Workspace not found:', `${workspaceId}-notes`);
        return;
    }

    if (workspace.notesSnapshot?.content) {
        Y.applyUpdate(ydoc, new Uint8Array(workspace.notesSnapshot.content));
    }
}

// websocket server with yjs
const wss = new WebSocket.Server({server});
wss.on('connection', (conn, req)=>{
    const docName = req.url.slice(11);
    setupWSConnection(conn, req, {docName: docName});

    const [workspaceId, docType] = docName.split('-');
    const ydoc = getYDoc(docName);
    console.log(`YJS document ready: ${docName}`);
    activeDocuments.set(docName, ydoc);
    if(docType !== 'notes'){
        if(Array.from(ydoc.awareness.getStates().entries()).length===0){
            console.log('Fetching data from DB');
            setTimeout(()=>{
                updateYDocFromDB(docName, ydoc);
            }, 100)
        }

        conn.on('close', () => {
            console.log(`WebSocket connection closed for document: ${docName}`);
            
            // Save snapshot before cleanup
            const ydoc = activeDocuments.get(docName);
            if (ydoc) {
                saveSnapshot(docName, ydoc);
            }
            activeDocuments.delete(docName);
        });
    }
    else{
        if(Array.from(ydoc.awareness.getStates().entries()).length===0){
            console.log('Fetching data from DB for notes');
            setTimeout(()=>{
                updateNoteYDocFromDB(workspaceId, ydoc);
            }, 100)
        }

        conn.on('close', () => {
            console.log(`WebSocket connection closed for document: ${docName}`);
            
            // Save snapshot before cleanup
            const ydoc = activeDocuments.get(docName);
            if (ydoc) {
                saveNotesSnapshot(workspaceId, ydoc);
            }
            activeDocuments.delete(docName);
        });
    }
});

// Periodic snapshot saving (every 5 minutes for all active documents)
setInterval(() => {
    console.log(`Performing periodic snapshot for ${activeDocuments.size} active documents`);
    activeDocuments.forEach((ydoc, docName) => {
        saveSnapshot(docName, ydoc);
    });
}, 300000); // 5 minutes

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    
    // Save all active documents before shutdown
    const savePromises = [];
    activeDocuments.forEach((ydoc, docName) => {
        savePromises.push(saveSnapshot(docName, ydoc));
    });
    
    await Promise.all(savePromises);
    console.log('All snapshots saved. Server shutting down.');
    process.exit(0);
});


//start the server
server.listen(PORT, () => {
    console.log(`Collaboration Service is running on http://localhost:${PORT}`);
});