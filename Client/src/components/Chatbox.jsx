import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import socket from "../Socket";
import EmojiPicker from "emoji-picker-react";
import { useToast } from "./useToast";
import CallPanel from "./CallPanel";
import { ChevronDown } from "lucide-react";
import {
  Send,
  ArrowLeft,
  Paperclip,
  Smile,
   Mic,
  MoreVertical,
  Check,
  CheckCheck,
} from "lucide-react";

const fetchMessages = async (userId, contactId, offset = 0) => {
  const response = await axios.get(
    `http://localhost:5001/api/messages?receiver_id=${contactId}&limit=40&offset=${offset}`,
  );

  return {
    messages: response.data.messages.map((msg) => ({
    id: msg.id,
    message: msg.message,
    image: msg.image,
    file: msg.file,
    voice: msg.voice,
    sender_id: msg.sender_id,
    receiver_id: msg.receiver_id,
    created_at: msg.created_at,
    delivered: msg.delivered,
    seen: msg.seen,
    is_deleted: msg.is_deleted,
    deleted_for_me: msg.deleted_for_me,
    edited: msg.edited,
    edited_at: msg.edited_at,
    reaction: msg.reaction,
    reply_id: msg.reply_id,
    reply_message: msg.reply_message,
    reply_image: msg.reply_image,
    reply_file: msg.reply_file,
    })),
    hasMore: response.data.pagination.hasMore,
  };
};

const markMessagesSeen = async (userId, contactId) => {
  await axios.put("http://localhost:5001/api/messages/seen", {
    sender_id: contactId,
    receiver_id: userId,
  });

  socket.emit("messagesSeen", {
    sender_id: contactId,
    receiver_id: userId,
  });
};

export default function ChatBox({ selectedUser, setSelectedUser, onBack }) {
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageOffset, setMessageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [replyMessage, setReplyMessage] = useState(null);
  const [menuMessage, setMenuMessage] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState("above");
  const [editMessageId, setEditMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
const [audioBlob, setAudioBlob] = useState(null);
const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);

  const refreshMessages = useCallback(async () => {
    if (!selectedUser || !userId) return;

    try {
      const page = await fetchMessages(userId, selectedUser.id);
      setMessages(page.messages);
      setMessageOffset(0);
      setHasMoreMessages(page.hasMore);
      shouldScrollToBottomRef.current = true;
    } catch (error) {
      console.log(error);
    }
  }, [selectedUser, userId]);

  const loadOlderMessages = useCallback(async () => {
    if (!selectedUser || !userId || loadingOlder || !hasMoreMessages) return;

    const container = messagesContainerRef.current;
    const previousHeight = container?.scrollHeight || 0;
    const nextOffset = messageOffset + 40;

    try {
      setLoadingOlder(true);
      const page = await fetchMessages(userId, selectedUser.id, nextOffset);
      setMessages((currentMessages) => [...page.messages, ...currentMessages]);
      setMessageOffset(nextOffset);
      setHasMoreMessages(page.hasMore);

      setTimeout(() => {
        if (container) {
          container.scrollTop += container.scrollHeight - previousHeight;
        }
      }, 0);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMoreMessages, loadingOlder, messageOffset, selectedUser, userId]);


 const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const recorder = new MediaRecorder(stream);

    let chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, {
        type: "audio/webm",
      });
        console.log(blob);

      setAudioBlob(blob);
    };

    recorder.start();

    setMediaRecorder(recorder);

    setIsRecording(true);
  } catch (err) {
    console.log(err);
  }
};

const stopRecording = () => {
  if (!mediaRecorder) return;

  mediaRecorder.stop();

  setIsRecording(false);
};


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuMessage(null);
      }
    };

   

    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleSeen = () => {
      refreshMessages();
    };

    console.log("Chat Selected:", selectedUser);

    socket.on("messagesSeen", handleSeen);
    socket.on("messageDelivered", () => {
      refreshMessages();
    });

    return () => {
      socket.off("messagesSeen", handleSeen);
    };
  }, [refreshMessages, selectedUser]);

  useEffect(() => {
    console.log("ChatBox Mounted");

    return () => {
      console.log("ChatBox Unmounted");
    };
  }, []);
  useEffect(() => {
const handleReceiveMessage = async (data) => {
  console.log("📩 RECEIVE MESSAGE =", data);

  // =====================================
  // 1. RECEIVER KE LIYE DELIVERED
  // =====================================
  if (Number(data.receiver_id) === Number(userId)) {
    try {
      await axios.put(
        "http://localhost:5001/api/messages/delivered",
        {
          sender_id: data.sender_id,
          receiver_id: data.receiver_id,
        }
      );

      socket.emit("messageDelivered", {
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
      });

      console.log("✅ Message Delivered");
    } catch (error) {
      console.log("❌ Delivered Error =", error);
    }
  }

  // =====================================
  // 2. BROWSER NOTIFICATION
  // =====================================
  if (
    Notification.permission === "granted" &&
    Number(data.sender_id) !== Number(userId)
  ) {
    new Notification(data.senderName || "New Message", {
      body: data.message || "New message",
      icon: "/vite.svg",
    });
  }

  // =====================================
  // 3. CHECK CURRENT OPEN CHAT
  // =====================================
  const isCurrentChat =
    selectedUser &&
    Number(data.sender_id) === Number(selectedUser.id) &&
    Number(data.receiver_id) === Number(userId);

  // =====================================
  // 4. MESSAGE CURRENT CHAT ME ADD
  // =====================================
  if (isCurrentChat) {
    shouldScrollToBottomRef.current = true;
    setMessages((prev) => {
      const alreadyExists = prev.some(
        (msg) => Number(msg.id) === Number(data.id)
      );

      if (alreadyExists) {
        return prev;
      }

      return [...prev, data];
    });

    // =================================
    // 5. MESSAGE SEEN
    // =================================
    await markMessagesSeen(userId, selectedUser.id);

    // =================================
    // 6. SIDEBAR KA GREEN UNREAD COUNT
    // =================================
    

    console.log("🟢 Current chat message marked as seen");
  } else {
    // Message kisi doosri chat ka hai
    // Isliye unread count sidebar me rahega
    

    console.log("🔔 Message belongs to another chat");
  }
};

;




 // Sender ko Delivered event mila
    const handleDelivered = () => {
        console.log("✅ Message Delivered");

    };

    // Socket Listeners
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageDelivered", handleDelivered);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageDelivered", handleDelivered);
    };
  }, [selectedUser, userId]);

  useEffect(() => {
    if (!selectedUser || !userId) return;

    const handleTyping = (data) => {
      console.log("⌨ Typing Data:", data);
      console.log("Selected User:", selectedUser.id);
      console.log("Logged User:", userId);

      const isCurrentChat =
        Number(data.sender_id) === Number(selectedUser.id) &&
        Number(data.receiver_id) === Number(userId);

      if (isCurrentChat) {
        console.log("✅ SET TYPING TRUE");
        setTyping(true);
      }
    };

    const handleStopTyping = (data) => {
      console.log("✋ Stop Typing:", data);

      const isCurrentChat =
        Number(data.sender_id) === Number(selectedUser.id) &&
        Number(data.receiver_id) === Number(userId);

      if (isCurrentChat) {
        console.log("❌ SET TYPING FALSE");
        setTyping(false);
      }
    };

    socket.off("typing");
    socket.off("stopTyping");

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [selectedUser, userId]);

  useEffect(() => {
    console.log("Typing State Changed:", typing);
  }, [typing]);

  useEffect(() => {
    if (!selectedUser || !userId) return undefined;

    markMessagesSeen(userId, selectedUser.id).catch((error) => {
      console.log("❌ Seen Error =", error);
    });

    const refreshTimer = setTimeout(() => {
      refreshMessages();
    }, 0);

    return () => clearTimeout(refreshTimer);
  }, [refreshMessages, selectedUser, userId]);


 const handleReaction = async (id, emoji) => {
  console.log(id, emoji);

  try {
    await axios.put("http://localhost:5001/api/messages/reaction", {
      message_id: id,
      reaction: emoji,
    });

    refreshMessages();
  } catch (err) {
    console.log(err);
  }
};

  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      shouldScrollToBottomRef.current = false;
    }
  }, [messages]);

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

const sendMessage = async () => {

  let fileUrl = "";
  let voiceUrl = "";

  if (!message.trim() && !selectedFile && !audioBlob) return;

  // ===========================
  // EDIT MESSAGE
  // ===========================
  if (editMessageId) {
    try {
      await axios.put("http://localhost:5001/api/messages/edit", {
        message_id: editMessageId,
        message,
      });

      setEditMessageId(null);
      setMessage("");

      await refreshMessages();
      return;

    } catch (err) {
      console.log(err);
      return;
    }
  }

  try {

    console.log("1️⃣ Send Button Clicked");

    // ===========================
    // FILE UPLOAD
    // ===========================
    if (selectedFile) {

      console.log("2️⃣ Uploading File");

      const formData = new FormData();

      formData.append("file", selectedFile);

      const uploadRes = await axios.post(
        "http://localhost:5001/api/messages/upload",
        formData
      );

      console.log("✅ File Upload =", uploadRes.data);

      fileUrl = uploadRes.data.fileUrl;
    }

    // ===========================
    // VOICE UPLOAD
    // ===========================
    console.log("🎤 audioBlob =", audioBlob);

    if (audioBlob) {

      const formData = new FormData();

      formData.append("voice", audioBlob, "voice.webm");

      console.log("3️⃣ Uploading Voice...");

      const uploadRes = await axios.post(
        "http://localhost:5001/api/messages/upload-voice",
        formData
      );

      console.log("✅ Voice Upload Response =", uploadRes.data);

      voiceUrl = uploadRes.data.voice;

      console.log("🎵 voiceUrl =", voiceUrl);
    }

    console.log("4️⃣ Sending Message API");

    console.log({
      sender_id: user.id,
      receiver_id: selectedUser.id,
      message,
      image: fileUrl,
      file: fileUrl,
      voice: voiceUrl,
    });

    const res = await axios.post(
      "http://localhost:5001/api/messages/send",
      {
        sender_id: user.id,
        receiver_id: selectedUser.id,
        message,

        image:
          selectedFile &&
          selectedFile.type.startsWith("image/")
            ? fileUrl
            : "",

        file:
          selectedFile &&
          !selectedFile.type.startsWith("image/")
            ? fileUrl
            : "",

        voice: voiceUrl,

        reply_id: replyMessage ? replyMessage.id : null,
      }
    );

    console.log("✅ Message Sent =", res.data);

    socket.emit("sendMessage", res.data);

    setMessage("");
    setSelectedFile(null);
    setReplyMessage(null);
    setAudioBlob(null);

    document.getElementById("fileInput").value = "";

    socket.emit("stopTyping", {
      sender_id: user.id,
      receiver_id: selectedUser.id,
    });

    setTyping(false);socket.emit("sendMessage", res.data);

// Sender ki chat bhi database se refresh hogi
await refreshMessages();

setMessage("");
setSelectedFile(null);
setReplyMessage(null);
setAudioBlob(null);

document.getElementById("fileInput").value = "";

socket.emit("stopTyping", {
  sender_id: user.id,
  receiver_id: selectedUser.id,
});

setTyping(false);



  } catch (error) {
    console.log("❌ ERROR =", error);
  }
};

  const updateMessage = async () => {
    try {
      await axios.put("http://localhost:5001/api/messages/edit", {
        message_id: editMessageId,
        message: editText,
      });

      setEditMessageId(null);
      setEditText("");
      setMessage("");

      await refreshMessages();
    } catch (err) {
      console.log(err);
    }
  };

  const handleDeleteForMe = async (id) => {
    try {
      const res = await axios.put(
        "http://localhost:5001/api/messages/delete-for-me",
        {
          message_id: id,
          user_id: user.id,
        },
      );

      console.log(res.data);

      await refreshMessages();

      setMenuMessage(null);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDeleteForEveryone = async (id) => {
  try {
    await axios.put(
      "http://localhost:5001/api/messages/delete-for-everyone",
      {
        message_id: id,
      }
    );

    await refreshMessages();

    socket.emit("messageDeleted");
  } catch (err) {
    console.log(err);
  }
};

  console.log("🔥 ChatBox Render");
  console.log("selectedUser =", selectedUser);

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Offline";

    const date = new Date(lastSeen);
    const now = new Date();

    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) {
      return "Last seen just now";
    }

    if (diff < 3600) {
      return `Last seen ${Math.floor(diff / 60)} minute ago`;
    }

    if (diff < 86400) {
      return (
        "Last seen today at " +
        date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }

    return (
      "Last seen " +
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

const archiveChat = async () => {
  if (!selectedUser) {
    showToast("Select a chat before archiving it.", "info");
    return;
  }

  try {
    await axios.post(
      "http://localhost:5001/api/messages/archive",
      {
        user_id: user.id,
        contact_id: selectedUser.id,
      }
    );

    console.log("📦 Chat Archived:", selectedUser.name);

    setShowMenu(false);

    // Chat selection clear
    setSelectedUser(null);

  } catch (error) {
    console.log("❌ Archive Error:", error);
  }
};




  return (
    <div className="h-full flex flex-col bg-[#07111f]">
      {/* Header */}
      <div className="h-20 px-4 md:px-7 border-b border-slate-700/70 flex items-center justify-between bg-[#0d1a2b]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Back to chats"
            onClick={onBack}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-300 font-bold text-lg">
            {selectedUser?.avatar ? (
              <img src={`http://localhost:5001${selectedUser.avatar}`} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              selectedUser?.name?.charAt(0).toUpperCase() || ""
            )}
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg tracking-tight">
              {selectedUser?.name || "Select User"}
            </h2>

            <p
              className={`text-sm ${
                typing ? "text-emerald-400 animate-pulse" : "text-slate-500"
              }`}
            >
              {!selectedUser
                ? "Select a chat"
                : typing
                  ? "Typing..."
                  : selectedUser.status === "online"
                    ? "🟢 Online"
                    : formatLastSeen(selectedUser.last_seen)}
            </p>
          </div>
        </div>
<div className="flex gap-3 text-slate-400 items-center">
  <CallPanel selectedUser={selectedUser} />

  {/* More Menu */}
  <div className="relative">
    <button
      type="button"
      onClick={() => setShowMenu((prev) => !prev)}
      className="p-1 rounded-full hover:bg-slate-800 hover:text-white"
    >
      <MoreVertical size={24} />
    </button>

   {showMenu && (
  <div className="absolute right-0 top-10 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">

    <button
      type="button"
      className="w-full text-left px-4 py-3 text-white hover:bg-slate-700"
    >
      🔕 Mute
    </button>

    <button
      type="button"
      className="w-full text-left px-4 py-3 text-white hover:bg-slate-700"
    >
      📌 Pin
    </button>

    {/* Archive */}
    <button
      type="button"
      onClick={archiveChat}
      className="w-full text-left px-4 py-3 text-white hover:bg-slate-700"
    >
      📦 Archive Chat
    </button>

    <button
      type="button"
      className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-700"
    >
      🗑 Delete
    </button>

  </div>
)}
  </div>
</div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={(event) => {
          if (event.currentTarget.scrollTop < 80) {
            loadOlderMessages();
          }
        }}
        className="relative flex-1 overflow-y-auto p-5 md:p-7"
      >
        {loadingOlder && (
          <p className="text-center text-xs text-slate-500 mb-4">
            Loading older messages...
          </p>
        )}
        {!selectedUser && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-5 w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center">
                <Send size={28} className="text-emerald-300" />
              </div>
              <h2 className="text-white text-2xl font-semibold tracking-tight">
                Your conversations
              </h2>
              <p className="mt-2 text-slate-500 text-sm leading-6">
                Select a person from your chats to start messaging.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => {
             console.log(msg.voice);
          console.log(msg);

          return (
            <div
              key={msg.id}
              className={`flex mb-4 ${
                Number(msg.sender_id) === Number(user.id)
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  setReplyMessage(msg);
                }}
                className={`relative group max-w-[70%] px-4 pt-4 pb-3 rounded-2xl ${
                  Number(msg.sender_id) === Number(user.id)
                    ? "bg-green-700 text-white"
                    : "bg-slate-800 text-white"
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuMessage?.id === msg.id) {
                      setMenuMessage(null);
                      return;
                    }

                    const messageTop = e.currentTarget.getBoundingClientRect().top;
                    setMenuPlacement(messageTop < 340 ? "below" : "above");
                    setMenuMessage(msg);
                  }}
                  className="
                         absolute
                        top-1
                        right-1
                        hidden
                        group-hover:flex
                        items-center
                        justify-center
                      
                        rounded-full
                        bg-slate-400
                        hover:bg-slate-600
                        z-50
                          "
                >
                  <ChevronDown size={15} className="text-white" />
                </button>
                {menuMessage?.id === msg.id && (
                  <div
                    ref={menuRef}


                    onClick={(e) => e.stopPropagation()}
                    className={`
                           absolute
                           ${menuPlacement === "above" ? "bottom-full mb-2" : "top-full mt-2"}
                           ${
                             Number(msg.sender_id) === Number(user.id)
                               ? "right-0"
                               : "left-0"
                           }
                           w-52
                           bg-slate-800
                           rounded-xl
                           shadow-2xl
                           border
                           border-slate-700
                           z-[99999]
                           overflow-hidden
                         `}
                  >

  {/* 👇 YAHAN PASTE KARNA HAI (Reply se upar) */}
    <div className="flex justify-center gap-2 px-3 py-2 border-b border-slate-700">
      <button onClick={() => handleReaction(msg.id, "❤️")}>❤️</button>
      <button onClick={() => handleReaction(msg.id, "😂")}>😂</button>
      <button onClick={() => handleReaction(msg.id, "👍")}>👍</button>
      <button onClick={() => handleReaction(msg.id, "😮")}>😮</button>
      <button onClick={() => handleReaction(msg.id, "😢")}>😢</button>
      <button onClick={() => handleReaction(msg.id, "🙏")}>🙏</button>
    </div>

                    <button
                      onClick={() => {
                        setReplyMessage(msg);
                        setMenuMessage(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700"
                    >
                      ↩ Reply
                    </button>

                    <button
                      onClick={() => {
                        setEditMessageId(msg.id);
                        setEditText(msg.message); // ✅ editText use hoga
                        setMenuMessage(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700"
                    >
                      ✏ Edit
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.message);
                        setMenuMessage(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700"
                    >
                      📋 Copy
                    </button>

                    <button
                      onClick={() => {
                        handleDeleteForMe(msg.id);
                        setMenuMessage(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700"
                    >
                      🗑 Delete For Me
                    </button>

                    {Number(msg.sender_id) === Number(user.id) && (
                      <button
                        onClick={() => {
                          handleDeleteForEveryone(msg.id);
                          setMenuMessage(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-700 text-red-400"
                      >
                        🗑 Delete For Everyone
                      </button>
                    )}
                  </div>
                )}

                

         {Number(msg.is_deleted) === 1 ? (
  <p className="italic text-gray-400">
    🗑 This message was deleted
  </p>
) : (
  <>
    {msg.image && (
      <img
        src={`http://localhost:5001${msg.image}`}
        alt="chat"
        className="w-56 rounded-xl mb-2"
      />
    )}

    {msg.file && (
      <a
        href={`http://localhost:5001${msg.file}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 bg-slate-700 p-3 rounded-lg mt-2"
      >
        📄 {msg.file.split("/").pop()}
      </a>
    )}

    {msg.reply_id && (
      <div className="mb-2 border-l-4 border-green-400 bg-slate-600 rounded-md px-3 py-2">
        <p className="text-green-300 text-xs font-semibold">
          Reply
        </p>

        {msg.reply_message && (
          <p className="text-xs text-gray-200 truncate">
            {msg.reply_message}
          </p>
        )}

        {msg.reply_image && (
          <p className="text-xs text-gray-200">📷 Photo</p>
        )}

        {msg.reply_file && (
          <p className="text-xs text-gray-200">📄 File</p>
        )}
      </div>
    )}

   {/* Message */}

{msg.message && <p>{msg.message}</p>}


{msg.voice && (


  <div className="mt-2">
        <p className="text-red-500">{msg.voice}</p>
    <audio controls className="w-64">
      <source
        src={`http://localhost:5001${msg.voice}`}
        type="audio/webm"
      />
      Your browser does not support audio.
    </audio>
  </div>
)}

{/* 👇 Reaction yahi par add karna hai */}

</>
)}
                <div className="flex justify-end items-center gap-1 mt-1">

{msg.reaction && (
  <div
    className={`
      absolute
      -bottom-3
      ${
        Number(msg.sender_id) === Number(user.id)
          ? "right-2"
          : "-left-2"
      }
      bg-slate-700
      border
      border-slate-600
      rounded-full
      px-2
      py-1
      text-sm
      shadow-lg
    `}
  >
    {msg.reaction}
  </div>
)}

                  {Number(msg.edited) === 1 && (
                    <span className="text-[10px] text-gray-300 italic">
                      edited
                    </span>
                  )}

                  <span className="text-[10px] text-gray-300">
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>

                  {Number(msg.sender_id) === Number(user.id) && (
                    <>
                      {msg.delivered ? (
                        <CheckCheck
                          size={14}
                          strokeWidth={2.5}
                          className={
                            Number(msg.seen) === 1
                              ? "text-blue-400"
                              : "text-gray-300"
                          }
                        />
                      ) : (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="text-gray-300"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef}></div>
      </div>

      {/* Footer Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        {/* 👇 Ye yaha add karna hai */}

        {/* Reply Preview */}
        {replyMessage && (
          <div className="mb-3 bg-slate-800 border-l-4 border-green-500 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="text-green-400 text-sm font-semibold">
                Replying...
              </p>

              <p className="text-white text-sm truncate max-w-[250px]">
                {replyMessage.message
                  ? replyMessage.message
                  : replyMessage.image
                    ? "📷 Photo"
                    : "📄 File"}
              </p>
            </div>

            <button
              onClick={() => setReplyMessage(null)}
              className="text-gray-400 hover:text-red-500 text-xl"
            >
              ✕
            </button>
          </div>
        )}

        {selectedFile && (
          <div className="mb-2 flex items-center gap-3">
            {/* Agar image hai to preview dikhao */}
            {selectedFile.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt=""
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              /* Agar PDF/PPT/DOCX hai to icon dikhao*/
              <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-3xl">
                📄
              </div>
            )}

            <span className="text-white text-sm">{selectedFile.name}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="text-slate-400 hover:text-white"
            >
              <Smile />
            </button>

            {showEmoji && (
              <div className="absolute bottom-12 left-0 z-50">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>

          <>
            <input
              type="file"
              id="fileInput"
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp3,.wav,.mp4"
              hidden
              onChange={(e) => {
                setSelectedFile(e.target.files[0]);
              }}
            />

            <button
              onClick={() => document.getElementById("fileInput").click()}
              className="text-slate-400 hover:text-white"
            >
              <Paperclip />
            </button>
          </>

          <input
            type="text"
            value={editMessageId ? editText : message}
            placeholder={
              editMessageId ? "Edit message..." : "Type a message..."
            }
            onChange={(e) => {
              if (editMessageId) {
                setEditText(e.target.value);
              } else {
                setMessage(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;

              if (editMessageId) {
                updateMessage();
              } else {
                sendMessage();
              }
            }}
            className="flex-1 w-full bg-slate-800 text-white px-4 py-3 rounded-xl outline-none"
          />

     <button
  onMouseDown={startRecording}
  onMouseUp={stopRecording}
  className="p-2 rounded-full hover:bg-slate-700 transition"
>
  <Mic
    size={22}
    className={isRecording ? "text-red-500" : "text-gray-300 bg-gray-400"}
  />
</button>

          <button
            onClick={sendMessage}
            className="bg-green-600 hover:bg-green-700 p-3 rounded-xl text-white"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
