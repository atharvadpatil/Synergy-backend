const express = require("express");
const { createWorkspace, addCollaborator } = require('../controllers/colabController');

const router = express.Router();

router.post("/create", createWorkspace);
router.post("/add", addCollaborator);


module.exports = router;