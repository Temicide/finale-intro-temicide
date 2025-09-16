import User from "../models/userModel.js";
import crypto from "crypto";

function hashPasswordWithScrypt(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

function verifyPasswordWithScrypt(password, stored) {
  const [saltHex, keyHex] = stored.split(":");
  const salt = Buffer.from(saltHex, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(keyHex, "hex"), derivedKey);
}

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if username or email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, error: "Email already registered." });
    }
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, error: "Username already taken." });
    }

    const passwordHash = hashPasswordWithScrypt(password);

    const newUser = await User.create({
      username,
      email,
      passwordHash,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      userId: newUser._id,
      username: newUser.username,
      email: newUser.email,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid email or password." });
    }

    const isMatch = verifyPasswordWithScrypt(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid email or password." });
    }

    // Stateless auth: return identifiers to client

    res.status(200).json({
      success: true,
      message: "Login successful!",
      userId: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
