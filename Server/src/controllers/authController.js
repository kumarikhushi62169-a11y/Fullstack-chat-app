const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "chat-app-development-secret";


const login = (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],
    async (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = result[0];

      const match = await bcrypt.compare(
        password,
        user.password
      );

      if (!match) {
        return res.status(400).json({
          success: false,
          message: "Invalid Password",
        });
      }

      db.query(
        "UPDATE users SET status='online' WHERE id=?",
        [user.id],
      );

      const token = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      res.status(200).json({
        success: true,
        message: "Login Successful",
        token,
        user: {
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  status: "online",

        },
      });
    }
  );
};



// Register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    db.query(
      "SELECT * FROM users WHERE email=?",
      [email],
      async (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          "INSERT INTO users(name,email,password) VALUES(?,?,?)",
          [name, email, hashedPassword],
          (err) => {
            if (err) return res.status(500).json(err);

            res.status(201).json({
              success: true,
              message: "User Registered Successfully",
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json(error);
  }
};



module.exports = {
  register,
  login,
};