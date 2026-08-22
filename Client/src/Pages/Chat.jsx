import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/Chatbox";
import GroupChatbox from "../components/GroupChatbox";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../Socket";

export default function Chat() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const handleSelectedUser = (userToSelect) => {
    setSelectedUser(userToSelect);
    setSelectedGroup(null);
    setShowSidebar(!userToSelect);
  };

  const handleBackToChats = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
    setShowSidebar(true);
  };

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      const clearTimer = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(clearTimer);
    }

    const searchTimer = setTimeout(async () => {
      try {
        const response = await axios.get(
          `http://localhost:5001/api/messages/search?q=${encodeURIComponent(searchQuery.trim())}`,
        );
        setSearchResults(response.data);
      } catch (error) {
        console.log(error);
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  const handleSearchResult = (result) => {
    const contactId = Number(result.sender_id) === Number(userId)
      ? result.receiver_id
      : result.sender_id;
    const contact = {
      id: contactId,
      name: Number(result.sender_id) === Number(userId)
        ? result.receiverName
        : result.senderName,
    };
    handleSelectedUser(contact);
    setSearchQuery("");
    setSearchResults([]);
  };

useEffect(() => {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}, []);

useEffect(() => {
  if (!userId || !localStorage.getItem("token")) {
    navigate("/");
    return;
  }

  socket.auth = { token: localStorage.getItem("token") };
  if (!socket.connected) socket.connect();

  console.log("🟢 Sending userOnline:", userId);

  socket.emit("userOnline", userId);

  return () => {
    socket.disconnect();
  };
}, [navigate, userId]);

  return (
    <div className="h-screen flex flex-col bg-[#07111f] overflow-hidden">
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        onSearchResult={handleSearchResult}
      />

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <div
          className={`${showSidebar ? "flex" : "hidden"} md:flex absolute inset-0 z-20 w-full md:static md:w-[21rem] md:shrink-0 border-r border-slate-800/80`}
        >
          <Sidebar
            setSelectedUser={handleSelectedUser}
            selectedUser={selectedUser}
            setSelectedGroup={(group) => { setSelectedGroup(group); setSelectedUser(null); setShowSidebar(false); }}
            selectedGroup={selectedGroup}
          />
        </div>

        <div className="min-w-0 flex-1">
          {selectedGroup ? (
            <GroupChatbox group={selectedGroup} onBack={handleBackToChats} />
          ) : (
            <ChatBox
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              onBack={handleBackToChats}
            />
          )}
        </div>
      </div>
    </div>
  );
}
