const jwt = require("jsonwebtoken");

module.exports = function verifyAdminJWT(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    if (!decoded.role || decoded.role !== "super-admin") {
      return res.status(403).json({ message: "Access restricted" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};