const db = require("../config/db");
// Get All Users + Last Message
const getUsers = (req, res) => {
  const currentUser = req.user.id;

  const sql = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.avatar,
      u.status,
      u.last_seen,

      (
        SELECT
          CASE
            WHEN image IS NOT NULL AND image != '' THEN '📷 Photo'
            WHEN file IS NOT NULL AND file != '' 
              THEN CONCAT('📄 ', SUBSTRING_INDEX(file, '/', -1))
            WHEN message IS NOT NULL AND message != '' THEN message
            ELSE 'No messages'
          END
        FROM messages
        WHERE
          (sender_id = u.id AND receiver_id = ?)
          OR
          (sender_id = ? AND receiver_id = u.id)
        ORDER BY created_at DESC
        LIMIT 1
      ) AS lastMessage,

      (
        SELECT sender_id
        FROM messages
        WHERE
          (sender_id = u.id AND receiver_id = ?)
          OR
          (sender_id = ? AND receiver_id = u.id)
        ORDER BY created_at DESC
        LIMIT 1
      ) AS lastSender,

      (
        SELECT created_at
        FROM messages
        WHERE
          (sender_id = u.id AND receiver_id = ?)
          OR
          (sender_id = ? AND receiver_id = u.id)
        ORDER BY created_at DESC
        LIMIT 1
      ) AS lastTime,

      (
        SELECT COUNT(*)
        FROM messages
        WHERE
          sender_id = u.id
          AND receiver_id = ?
          AND seen = 0
      ) AS unread

    FROM users u

    WHERE u.id != ?

      -- Archived chat ko normal Chats list se hide karo
      AND NOT EXISTS (
        SELECT 1
        FROM chat_archives ca
        WHERE
          ca.user_id = ?
          AND ca.contact_id = u.id
      )

    ORDER BY lastTime DESC
  `;

  db.query(
    sql,
    [
      currentUser, // lastMessage
      currentUser,

      currentUser, // lastSender
      currentUser,

      currentUser, // lastTime
      currentUser,

      currentUser, // unread

      currentUser, // u.id != currentUser

      currentUser, // archive check
    ],
    (err, result) => {
      if (err) {
        console.log("❌ Get Users Error:", err);
        return res.status(500).json(err);
      }

      console.log("Users API Result:");
      console.log(result);

      res.status(200).json(result);
    }
  );
};
// User Offline
const offlineUser = (req, res) => {
  const id = req.user.id;

  db.query(
    "UPDATE users SET status='offline' WHERE id=?",
    [id],
    (err) => {
      if (err) {
        return res.status(500).json(err);
      }

      res.status(200).json({
        success: true,
        message: "User Offline Successfully",
      });
    }
  );
};

const getProfile = (req, res) => {
  db.query(
    "SELECT id, name, email, avatar, status, last_seen FROM users WHERE id=?",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(result[0]);
    },
  );
};

const updateProfile = (req, res) => {
  const name = req.body.name?.trim();
  const avatar = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  const query = avatar
    ? "UPDATE users SET name=?, avatar=? WHERE id=?"
    : "UPDATE users SET name=? WHERE id=?";
  const values = avatar ? [name, avatar, req.user.id] : [name, req.user.id];

  db.query(query, values, (err) => {
    if (err) return res.status(500).json(err);

    db.query(
      "SELECT id, name, email, avatar, status, last_seen FROM users WHERE id=?",
      [req.user.id],
      (profileError, result) => {
        if (profileError) return res.status(500).json(profileError);
        res.json({ success: true, user: result[0] });
      },
    );
  });
};

module.exports = {
  getUsers,
  offlineUser,
  getProfile,
  updateProfile,
};