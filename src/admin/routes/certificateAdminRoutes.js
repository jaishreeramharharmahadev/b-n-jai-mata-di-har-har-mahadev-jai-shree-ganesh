const express = require("express");
const verifyAdminJWT = require("../middlewares/verifyAdminJWT");
const {
  getCertificates,
  deleteCertificate
} = require("../controllers/adminCertificateController");

const router = express.Router();

// Protected admin certificate operations
router.get("/", verifyAdminJWT, getCertificates);
router.delete("/:id", verifyAdminJWT, deleteCertificate);

module.exports = router;