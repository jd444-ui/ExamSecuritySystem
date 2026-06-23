const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  let token = req.header("Authorization");

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      msg: "No token. Please login first."
    });
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice(7);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded.user;

    next();

  } catch (error) {
    return res.status(401).json({
      msg: "Invalid token."
    });
  }
};

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        msg: "Unauthorized."
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        msg: "Access denied. You do not have permission."
      });
    }

    next();
  };
};

module.exports = {
  auth,
  allowRoles
};