const Workspace = require('../models/workspace');
const { nanoid } = require('nanoid');
const authClient = require("../grpcClient");

exports.createWorkspace = async (req, res) => {
    try {
        const { name, avatar, userName} = req.body;
        const uniqueLink = nanoid(10);
        const workspace = new Workspace({
            name,
            ownerId: req.user.id,
            ownerEmail: req.user.email,
            ownerName: userName,
            uniqueLink,
            collaborators: [
                { userId: req.user.id, userName: userName, userEmail: req.user.email, userAvatar: avatar, role: 'Editor' }
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
        });
    }
}

exports.addCollaborator = async (req, res) => {
    try {
        const { workspaceId, email, role } = req.body;
        
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return res.status(404).json({ success: false, message: "Workspace not found" });

        if(workspace.ownerId!==req.user.id){
            return res.status(403).json({success: false, message: "Access denied"})
        }
        
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
            const userName = response.userName;
            const userEmail = response.userEmail;
            const userAvatar = response.userAvatar;

            workspace.collaborators.push({ userId, userName, userEmail, userAvatar, role });
            await workspace.save();

            res.json({ success: true, message: "User added successfully", workspace });
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getWorkspaceById = async (req, res) => {
    try {
        const uniqueLink = req.params.uid;
        let workspace;

        workspace = await Workspace.findOne({uniqueLink: uniqueLink});

        if(!workspace){
            return res.status(404).json({
                success: false,
                message: "Invalide workspace"
            })
        }

        //check user's access
        const isCollaborator = workspace.collaborators.some(collab=>collab.userId === req.user.id);

        if(!isCollaborator){
            return res.status(403).json({
                success: false,
                message: "Access denied"
            })
        }

        res.json({ success: true, workspace });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
        });
    }
}

exports.getUserWorkspaces = async (req, res) => {
    try {
        //find workspaces where user is owner
        const ownedWorkspaces = await Workspace.find({ownerId: req.user.id})
                                                .sort({ updatedAt: -1 })
                                                .select('name ownerName uniqueLink collaborators updatedAt -_id');

        const sharedWorkspaces = await Workspace.find({
                                                        $and: [
                                                            { ownerId: { $ne: req.user.id } },
                                                            {'collaborators.userId': req.user.id}
                                                        ]
                                                    }
                                                )
                                                .sort({ updatedAt: -1 })
                                                .select('name ownerName uniqueLink collaborators updatedAt -_id');

        res.json({ success: true, ownedWorkspaces, sharedWorkspaces });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
        });
    }
}