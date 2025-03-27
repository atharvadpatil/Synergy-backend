const Workspace = require('../models/workspace');
const { nanoid } = require('nanoid');


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