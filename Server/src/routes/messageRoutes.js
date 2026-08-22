const express = require("express");
const router = express.Router();

const upload = require("../middleware/multer");
const authMiddleware = require("../middleware/authMiddleware");

const {
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

    

} = require("../controllers/messageController");

router.use(authMiddleware);

router.post("/send", sendMessage);
router.get("/search", searchMessages);

router.post(
  "/upload",
  upload.single("file"),
  uploadImage
);

router.get("/", getMessages);

router.put("/seen", seenMessages);

router.put("/delivered", deliveredMessages);

router.put("/delete-for-me", deleteForMe);

router.put("/delete-for-everyone", deleteForEveryone);

router.put("/edit", editMessage);

router.put("/reaction", addReaction);
router.post( "/upload-voice",upload.single("voice"),uploadVoice);

router.post("/archive", archiveChat);
router.get("/archives", getArchivedChats);
router.delete("/archive", unarchiveChat);

module.exports = router;