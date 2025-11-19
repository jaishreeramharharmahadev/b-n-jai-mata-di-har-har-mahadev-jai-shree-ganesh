const express = require("express");
const router = express.Router();
const applicantController = require("../controllers/applicantController");
const auth = require("../middlewares/auth"); // your auth middleware

router.post("/register", applicantController.registerApplicantCore);
// router.post("/create-demo", applicantController.createApplicant);

// get week content
router.get("/week/:weekNumber", auth, applicantController.getWeekContent);

// complete week
router.post("/complete-week", auth, applicantController.completeWeek);

// upload assignment
router.post("/assignment/:weekNumber", auth, applicantController.uploadAssignment);

// submit project
router.post("/project", auth, applicantController.submitProject);

// protected routes
router.get("/me", auth, applicantController.getMe);
router.post("/complete-week", auth, applicantController.completeWeek);

module.exports = router;