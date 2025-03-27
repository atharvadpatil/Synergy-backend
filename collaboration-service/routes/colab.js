const express = require("express");
const { createWorkspace } = require('../controllers/colabController');

const router = express.Router();

router.post("/create", createWorkspace);

module.exports = router;