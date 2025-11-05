const express = require("express");
const router = express.Router();
const certCtrl = require("../controllers/certificateController");
const verifyToken = require('../middlewares/auth')

router.post("/generate/:uniqueId", verifyToken,  certCtrl.generateForApplicantRoute);
router.get("/download/:uniqueId",  verifyToken,  certCtrl.downloadByUniqueId);
router.get("/verify/:certificateNumber", certCtrl.verify);

module.exports = router;