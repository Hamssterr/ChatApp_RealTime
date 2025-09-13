import User from "../models/User.js";
import jwt from "jsonwebtoken";

// middleware/auth.js
export const protectRoute = async (req, res, next) => {
  try {
    const token = req.headers.token;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.user_id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error.message);
    req.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};
