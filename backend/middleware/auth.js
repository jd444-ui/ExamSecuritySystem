const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId =
      decoded.id ||
      decoded._id ||
      decoded.userId ||
      decoded.user?.id ||
      decoded.user?._id;

    let dbUser = null;

    if (userId) {
      dbUser = await User.findById(userId).select("-password").lean();
    }

    req.user = {
      id: dbUser?._id?.toString() || userId || "unknown-user",
      _id: dbUser?._id || userId || "unknown-user",

      email:
        dbUser?.email ||
        decoded.email ||
        decoded.user?.email ||
        "unknown-user",

      name:
        dbUser?.name ||
        decoded.name ||
        decoded.user?.name ||
        "unknown-user",

      role:
        dbUser?.role ||
        decoded.role ||
        decoded.user?.role ||
        "unknown"
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

module.exports = protect;