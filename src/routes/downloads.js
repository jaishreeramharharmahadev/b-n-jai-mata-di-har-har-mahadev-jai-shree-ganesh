const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const auth = require("../middlewares/auth");

const UPLOAD_ROOT = path.join(__dirname, "../uploads");
router.get("/assignment/:filename", auth, (req, res) => {
  const file = path.join(UPLOAD_ROOT, "assignments", req.params.filename);
  if (!fs.existsSync(file)) return res.status(404).json({ message: "Not found" });
  res.download(file);
});

router.get("/project/:filename", auth, (req, res) => {
  const file = path.join(UPLOAD_ROOT, "projects", req.params.filename);
  if (!fs.existsSync(file)) return res.status(404).json({ message: "Not found" });
  res.download(file);
});

module.exports = router;