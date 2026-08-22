const db = require("../config/db");

const getGroupMembership = (groupId, userId, callback) => {
  db.query(
    "SELECT role FROM group_members WHERE group_id=? AND user_id=?",
    [groupId, userId],
    (err, rows) => {
      if (err) return callback(err, null);
      callback(null, rows[0] || null);
    },
  );
};

const listGroups = (req, res) => {
  db.query(
    `SELECT
      g.id,
      g.name,
      g.avatar,
      g.owner_id,
      g.created_at,
      COUNT(gm_all.user_id) AS member_count
    FROM chat_groups g
    INNER JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    LEFT JOIN group_members gm_all ON gm_all.group_id = g.id
    GROUP BY g.id
    ORDER BY g.updated_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    },
  );
};

const createGroup = (req, res) => {
  const name = req.body.name?.trim();
  let memberIds = req.body.member_ids || [];

  if (!name) {
    return res.status(400).json({ message: "Group name is required" });
  }

  if (!Array.isArray(memberIds)) memberIds = [memberIds];
  memberIds = [...new Set(memberIds.map(Number).filter(Boolean))];
  memberIds = [...new Set([req.user.id, ...memberIds])];

  db.query(
    "INSERT INTO chat_groups (name, owner_id) VALUES (?, ?)",
    [name, req.user.id],
    (groupError, result) => {
      if (groupError) return res.status(500).json(groupError);

      const groupId = result.insertId;
      const values = memberIds.map((userId) => [
        groupId,
        userId,
        userId === req.user.id ? "owner" : "member",
      ]);

      db.query(
        "INSERT INTO group_members (group_id, user_id, role) VALUES ?",
        [values],
        (memberError) => {
          if (memberError) return res.status(500).json(memberError);
          res.status(201).json({ success: true, id: groupId, name });
        },
      );
    },
  );
};

const getGroupMembers = (req, res) => {
  getGroupMembership(req.params.groupId, req.user.id, (membershipError, membership) => {
    if (membershipError) return res.status(500).json(membershipError);
    if (!membership) return res.status(403).json({ message: "Group access denied" });

    db.query(
      `SELECT u.id, u.name, u.email, u.avatar, gm.role, gm.joined_at
       FROM group_members gm
       INNER JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id=?
       ORDER BY gm.role='owner' DESC, u.name ASC`,
      [req.params.groupId],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      },
    );
  });
};

const addGroupMember = (req, res) => {
  const groupId = Number(req.params.groupId);
  const memberId = Number(req.body.user_id);

  if (!memberId) return res.status(400).json({ message: "user_id is required" });

  getGroupMembership(groupId, req.user.id, (membershipError, membership) => {
    if (membershipError) return res.status(500).json(membershipError);
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return res.status(403).json({ message: "Only group admins can add members" });
    }

    db.query(
      "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
      [groupId, memberId],
      (err) => {
        if (err?.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "User is already a group member" });
        }
        if (err) return res.status(500).json(err);
        res.status(201).json({ success: true });
      },
    );
  });
};

const sendGroupMessage = (req, res) => {
  const groupId = Number(req.params.groupId);
  const message = req.body.message?.trim();

  if (!message) return res.status(400).json({ message: "Message is required" });

  getGroupMembership(groupId, req.user.id, (membershipError, membership) => {
    if (membershipError) return res.status(500).json(membershipError);
    if (!membership) return res.status(403).json({ message: "Group access denied" });

    db.query(
      "INSERT INTO group_messages (group_id, sender_id, message) VALUES (?, ?, ?)",
      [groupId, req.user.id, message],
      (err, result) => {
        if (err) return res.status(500).json(err);
        db.query(
          `SELECT gm.*, u.name AS senderName, u.avatar AS senderAvatar
           FROM group_messages gm
           INNER JOIN users u ON u.id = gm.sender_id
           WHERE gm.id=?`,
          [result.insertId],
          (selectError, rows) => {
            if (selectError) return res.status(500).json(selectError);
            res.status(201).json(rows[0]);
          },
        );
      },
    );
  });
};

const getGroupMessages = (req, res) => {
  const groupId = Number(req.params.groupId);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 40, 1), 100);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

  getGroupMembership(groupId, req.user.id, (membershipError, membership) => {
    if (membershipError) return res.status(500).json(membershipError);
    if (!membership) return res.status(403).json({ message: "Group access denied" });

    db.query(
      `SELECT gm.*, u.name AS senderName, u.avatar AS senderAvatar
       FROM group_messages gm
       INNER JOIN users u ON u.id = gm.sender_id
       WHERE gm.group_id=?
       ORDER BY gm.created_at DESC, gm.id DESC
       LIMIT ? OFFSET ?`,
      [groupId, limit, offset],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json({ messages: rows.reverse(), pagination: { limit, offset, hasMore: rows.length === limit } });
      },
    );
  });
};

module.exports = {
  listGroups,
  createGroup,
  getGroupMembers,
  addGroupMember,
  sendGroupMessage,
  getGroupMessages,
};
