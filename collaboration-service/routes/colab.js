const express = require("express");
const { createWorkspace, addCollaborator, getWorkspaceById } = require('../controllers/colabController');

const router = express.Router();

router.post("/create", createWorkspace);
router.post("/add", addCollaborator);
router.get("/:uid", getWorkspaceById);


module.exports = router;