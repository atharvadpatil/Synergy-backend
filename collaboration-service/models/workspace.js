const mongoose = require('mongoose');

const workspaceSchema = mongoose.Schema({
    name: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true },
    ownerName: { type: String, required: true },
    ownerEmail: { type: String, required: true },
    uniqueLink: { type: String, required: true, unique: true },
    collaborators: [{
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true },
        userAvatar: { type: String },
        role: { type: String, enum: ['Editor', 'Viewer'], default: 'Editor' },
    }],
    codeSnapshot: {
        content: { type: String, default: '' },
        language: { type: String, default: '' },
        input: { type: String, default: '' },
        output: { type: String, default: '' }
    },
    notesSnapshot: {
        content: { type: String, default: '' }
    },
    drawingSnapshot: {
        rectangles: { type: Array, default: [] },
        scribbles: { type: Array, default: [] },
        lines: { type: Array, default: [] },
        circles: { type: Array, default: [] },
        arrows: { type: Array, default: [] }
    },

}, { timestamps: true })

const Workspace = mongoose.model("Workspace", workspaceSchema);

module.exports = Workspace;