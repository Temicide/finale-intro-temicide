import User from "../models/userModel.js";
import crypto from "crypto";

export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    // Simple password hashing using built-in crypto
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    const newUser = await User.create({
      email,
      passwordHash,
    });

    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      userId: newUser._id,
      email: newUser.email,
    });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// เข้าสู่ระบบ
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // หา user จาก email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // ตรวจสอบรหัสผ่าน
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash !== user.passwordHash) {
      return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // ส่งผลลัพธ์สำเร็จ (ไม่สร้าง token)
    res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      userId: user._id,
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};
