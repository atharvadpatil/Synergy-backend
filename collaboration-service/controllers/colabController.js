const Workspace = require('../models/workspace');
const { nanoid } = require('nanoid');
const authClient = require("../grpcClient");

exports.createWorkspace = async (req, res) => {
    try {
        const name = req.body.name;
        const avatar = req.body.avatar;
        const uniqueLink = nanoid(10);
        const workspace = new Workspace({
            name,
            ownerId: req.user.id,
            ownerEmail: req.user.email,
            uniqueLink,
            collaborators: [
                { userId: req.user.id, userEmail: req.user.email, userAvatar: avatar, role: 'Editor' }
            ]
        });

        await workspace.save();

        res.status(201).json({
            success: true,
            message: "Workspace Created Successfully",
            workspace
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

exports.addCollaborator = async (req, res) => {
    try {
        const { workspaceId, email } = req.body;
        
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ success: false, message: "Workspace not found" });
        
        if (workspace.collaborators.some(collaborator => collaborator.userEmail == email)) {
            return res.status(400).json({ success: false, message: "User is already a collaborator" });
        }

        authClient.GetUserByEmail({ email }, async (error, response) => {
            if (error) {
                console.error("gRPC error:", error);
                return res.status(500).json({ success: false, message: "Error fetching user ID" });
            }

            if (!response || !response.userId) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const userId = response.userId;
            const userEmail = response.userEmail;
            const userAvatar = response.userAvatar;

            workspace.collaborators.push({ userId, userEmail, userAvatar });
            await workspace.save();

            res.json({ success: true, message: "User added successfully", workspace });
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
