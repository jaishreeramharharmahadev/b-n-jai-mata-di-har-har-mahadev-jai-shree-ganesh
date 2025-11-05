// utils/multer.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_ROOT = path.join(__dirname, "../uploads");
const ASSIGNMENT_DIR = path.join(UPLOAD_ROOT, "assignments");
const PROJECT_DIR = path.join(UPLOAD_ROOT, "projects");

fs.mkdirSync(ASSIGNMENT_DIR, { recursive: true });
fs.mkdirSync(PROJECT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // route should set req.uploadDir before calling
    const dir = req.uploadDir || ASSIGNMENT_DIR;
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // prefix with timestamp to avoid collisions
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  // allow pdf, ppt, pptx, docx, images (if needed)
  const allowed = /\.(pdf|ppt|pptx|docx|zip)$/i;
  if (!allowed.test(file.originalname)) {
    return cb(new Error("Unsupported file type"), false);
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 30 * 1024 * 1024 } }); // 30MB

module.exports = { upload, ASSIGNMENT_DIR, PROJECT_DIR };