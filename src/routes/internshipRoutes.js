const express = require("express");
const router = express.Router();
const { getAllInternships, getInternshipBySubDomain } = require("../controllers/internshipController");

router.get("/", getAllInternships);
// router.get("/:domain", getInternshipByDomain);
// router.get("/:subDomain", getInternshipByDomain);
router.get("/:subDomain", getInternshipBySubDomain);

module.exports = router;