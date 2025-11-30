const Admin = require("../../models/Admin");
const jwt = require("jsonwebtoken");

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin || !admin.isActive) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    // ⭐ Plain text compare
    if (admin.passwordHash !== password) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      message: "Login Successful",
      token,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};