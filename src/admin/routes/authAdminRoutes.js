const express = require("express");
const router = express.Router();
const { loginAdmin } = require("../../admin/controllers/adminAuthController");

router.post("/login", loginAdmin);

module.exports = router;