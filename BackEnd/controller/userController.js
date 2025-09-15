import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import cloudinary from "../lib/cloudinary.js";

// Signup new user
export const signup = async (req, res) => {
  const { email, fullName, password, bio } = req.body;
  try {
    // Validate inputs
    if (!email || !fullName || !password || !bio) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Check for existing user
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });

    // Generate token
    const token = generateToken(newUser._id);

    // Return response without password
    const userResponse = await User.findById(newUser._id).select("-password");
    res.json({
      success: true,
      user: userResponse,
      token,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "development" ? error.message : "Server Error",
    });
  }
};

// Login user
export const login = async (req, res) => {
  console.log('Login route called with body:', req.body);
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields',
      });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check user existence
    const userData = await User.findOne({ email });
    if (!userData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Credentials',
      });
    }

    // Compare password
    if (!userData.password) {
      return res.status(500).json({
        success: false,
        message: 'User account is corrupted: missing password',
      });
    }
    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Credentials',
      });
    }

    // Generate token
    const token = generateToken(userData._id);

    // Fetch user without password
    const userResponse = await User.findById(userData._id).select('-password');
    if (!userResponse) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user data',
      });
    }

    res.json({
      success: true,
      user: userResponse,
      token,
      message: 'User logged in successfully',
    });
  } catch (error) {
    console.error('Login error:', error.error); // Log full stack trace
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// Controller to check if user is authenticated
export const checkAuth = async (req, res) => {
  try {
    // protectRoute middleware already attaches req.user
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("CheckAuth Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;

    const userId = req.user._id;
    let updateUser;

    if (!profilePic) {
      updateUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);

      updateUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true }
      );
    }

    res.json({
      success: true,
      user: updateUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
