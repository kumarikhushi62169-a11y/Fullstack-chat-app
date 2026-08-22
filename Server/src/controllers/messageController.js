const db = require("../config/db");

const sendMessage = (req, res) => {
  const {
    receiver_id,
    message,
    image,
    file,
      voice,
    reply_id,
    
  } = req.body;
  const sender_id = req.user.id;

  if (!receiver_id || Number(receiver_id) === Number(sender_id)) {
    return res.status(400).json({
      success: false,
      message: "A valid receiver is required",
    });
  }
  console.log("VOICE =", voice);


  console.log("SEND API CALLED");
  db.query(
    "INSERT INTO messages(sender_id,receiver_id,message,image,file,voice,reply_id) VALUES(?,?,?,?,?,?,?)",
    [
      sender_id,
      receiver_id,
      message,
      image,
      file,
        voice,
      reply_id,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      db.query(
        `SELECT
          m.*,
          u.name AS senderName
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id=?`,
        [result.insertId],
        (err2, rows) => {
          if (err2) return res.status(500).json(err2);

          res.status(201).json(rows[0]);
        }
      );
    }
  );
};

const getMessages = (req, res) => {
  const sender_id = req.user.id;
  const { receiver_id } = req.query;
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 40;
  const offset = Number.isFinite(requestedOffset)
    ? Math.max(requestedOffset, 0)
    : 0;

  if (!receiver_id || Number(receiver_id) === Number(sender_id)) {
    return res.status(400).json({
      success: false,
      message: "A valid conversation is required",
    });
  }

  db.query(
    `SELECT
      m.*,

      r.message AS reply_message,
      r.image AS reply_image,
      r.file AS reply_file

    FROM messages m

    LEFT JOIN messages r
    ON m.reply_id = r.id

   WHERE
(
  (m.sender_id=? AND m.receiver_id=?)
  OR
  (m.sender_id=? AND m.receiver_id=?)
)

AND

(
  m.deleted_for_me IS NULL
  OR
  m.deleted_for_me=''
  OR
  FIND_IN_SET(?,m.deleted_for_me)=0
)
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ? OFFSET ?`,
    [
      sender_id,
  receiver_id,
  receiver_id,
  sender_id,
  sender_id,
      limit,
      offset,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.status(200).json({
        messages: result.reverse(),
        pagination: {
          limit,
          offset,
          hasMore: result.length === limit,
        },
      });
    }
  );
};
const searchMessages = (req, res) => {
  const query = req.query.q?.trim();

  if (!query || query.length < 2) {
    return res.json([]);
  }

  const userId = req.user.id;
  const pattern = `%${query}%`;

  db.query(
    `SELECT
      m.id,
      m.message,
      m.created_at,
      m.sender_id,
      m.receiver_id,
      sender.name AS senderName,
      receiver.name AS receiverName
    FROM messages m
    INNER JOIN users sender ON sender.id = m.sender_id
    INNER JOIN users receiver ON receiver.id = m.receiver_id
    WHERE (m.sender_id=? OR m.receiver_id=?)
      AND m.is_deleted=0
      AND m.message LIKE ?
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 30`,
    [userId, userId, pattern],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    },
  );
};

const seenMessages = (req, res) => {
  const receiver_id = req.user.id;
  const { sender_id } = req.body;

  console.log("Seen Request:", sender_id, receiver_id);

  db.query(
    `UPDATE messages
     SET seen = 1
     WHERE sender_id = ?
     AND receiver_id = ?
     AND seen = 0`,
    [sender_id, receiver_id],
    (err, result) => {

      if (err) {
        console.log(err);
        return res.status(500).json(err);
      }

      console.log("Affected Rows:", result.affectedRows);

      res.json({
        success: true,
      });
    }
  );
};

const deliveredMessages = (req, res) => {
  const receiver_id = req.user.id;
  const { sender_id } = req.body;

  db.query(
    `UPDATE messages
     SET delivered = 1
     WHERE sender_id = ?
     AND receiver_id = ?
     AND delivered = 0`,
    [sender_id, receiver_id],
    (err, result) => {
      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        success: true,
      });
    }
  );
};

const uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file selected",
      });
    }

    res.status(200).json({
      success: true,

      fileUrl: `/uploads/${req.file.filename}`,

      fileName: req.file.originalname,

      fileType: req.file.mimetype,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Upload Failed",
    });
  }
};

const deleteForMe = (req, res) => {
  const { message_id } = req.body;
  const user_id = req.user.id;

  db.query(
    "SELECT deleted_for_me FROM messages WHERE id=?",
    [message_id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({ message: "Message not found" });
      }

      const message = result[0];
      if (message.sender_id !== user_id && message.receiver_id !== user_id) {
        return res.status(403).json({ message: "Message access denied" });
      }

      let deletedUsers = message.deleted_for_me
        ? result[0].deleted_for_me.split(",")
        : [];

      if (!deletedUsers.includes(String(user_id))) {
        deletedUsers.push(String(user_id));
      }

      db.query(
        "UPDATE messages SET deleted_for_me=? WHERE id=?",
        [deletedUsers.join(","), message_id],
        (err2) => {
          if (err2) return res.status(500).json(err2);

          res.json({
            success: true,
            message: "Deleted For Me",
          });
        }
      );
    }
  );
};

const addReaction = (req, res) => {
  const { message_id, reaction } = req.body;

  db.query(
    "UPDATE messages SET reaction=? WHERE id=? AND (sender_id=? OR receiver_id=?)",
    [reaction, message_id, req.user.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json({
        success: true,
      });
    }
  );
};

const deleteForEveryone = (req, res) => {
  console.log(req.body);

  const { message_id } = req.body;

  db.query(
    "UPDATE messages SET is_deleted=1 WHERE id=? AND sender_id=?",
      [message_id, req.user.id],
    (err, result) => {

      console.log(result);

      if (err) return res.status(500).json(err);

      if (result.affectedRows === 0) {
        return res.status(403).json({ message: "Only the sender can delete this message" });
      }

      res.json({
        success: true,
      });
    }
  );
};

const editMessage = (req, res) => {
  const { message_id, message } = req.body;

  db.query(
    `UPDATE messages
     SET
     message=?,
     edited=1,
     edited_at=NOW()
     WHERE id=? AND sender_id=?`,
    [message, message_id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.affectedRows === 0) {
        return res.status(403).json({ message: "Only the sender can edit this message" });
      }

      res.json({
        success: true,
      });
    }
  );
};

const uploadVoice = (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No voice uploaded",
    });
  }

  res.json({
    success: true,
    voice: `/uploads/${req.file.filename}`,
  });
};

// ===============================
// ARCHIVE CHAT
// ===============================
const archiveChat = (req, res) => {
  const user_id = req.user.id;
  const { contact_id } = req.body;

  if (!user_id || !contact_id) {
    return res.status(400).json({
      message: "user_id and contact_id are required",
    });
  }

  const sql = `
    INSERT INTO chat_archives (user_id, contact_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE user_id = user_id
  `;

  db.query(sql, [user_id, contact_id], (err, result) => {
    if (err) {
      console.log("❌ Archive Error:", err);

      return res.status(500).json({
        message: "Failed to archive chat",
      });
    }

    console.log(
      "📦 Chat Archived:",
      user_id,
      contact_id
    );

    res.json({
      success: true,
      message: "Chat archived successfully",
    });
  });
};



const getArchivedChats = (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return res.status(400).json({
      message: "user_id is required",
    });
  }

  const sql = `
    SELECT
      ca.id AS archive_id,
      u.id,
      u.name,
      u.email,
      u.status,
      u.last_seen
    FROM chat_archives ca
    INNER JOIN users u
      ON u.id = ca.contact_id
    WHERE ca.user_id = ?
    ORDER BY ca.created_at DESC
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.log("❌ Get Archived Chats Error:", err);

      return res.status(500).json({
        message: "Failed to get archived chats",
        error: err.message,
      });
    }

    console.log("📦 Archived Chats:", result);

    res.status(200).json(result);
  });
};

const unarchiveChat = (req, res) => {
  const { contact_id } = req.body;

  if (!contact_id) {
    return res.status(400).json({
      message: "contact_id is required",
    });
  }

  db.query(
    "DELETE FROM chat_archives WHERE user_id=? AND contact_id=?",
    [req.user.id, contact_id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Archived chat not found" });
      }

      res.json({
        success: true,
        message: "Chat unarchived successfully",
      });
    },
  );
};

module.exports = {
  sendMessage,
  getMessages,
  searchMessages,
  seenMessages,
  deliveredMessages,
  uploadImage,
  deleteForMe,
  deleteForEveryone,
  editMessage,
  addReaction,
  uploadVoice,
  archiveChat,
  getArchivedChats,
  unarchiveChat,

};