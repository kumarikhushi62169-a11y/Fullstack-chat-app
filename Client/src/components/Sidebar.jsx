import { useEffect, useState } from "react";
import axios from "axios";

import socket from "../Socket";

import {
  Search,
  MessageCircle,
  Users,
  Archive,
  ArchiveRestore,
  Plus,
  UsersRound,
  X,
  Settings,
} from "lucide-react";

const fetchUsers = async (userId, setChats) => {
  try {
    const response = await axios.get(
      `http://localhost:5001/api/users?userId=${userId}`,
    );
    setChats(response.data);
  } catch (error) {
    console.log(error);
    setChats([]);
    throw error;
  }
};

const fetchArchivedChats = async (userId, setArchivedChats, setLoading) => {
  setLoading(true);

  try {
    const response = await axios.get(
      `http://localhost:5001/api/messages/archives?user_id=${userId}`,
    );
    setArchivedChats(response.data);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};

export default function Sidebar({ setSelectedUser, selectedUser, setSelectedGroup, selectedGroup }) {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("chats");

  
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const formatTime = (time) => {
    if (!time) return "";

    const date = new Date(time);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredChats = chats.filter((chat) =>
    chat.name?.toLowerCase().includes(search.toLowerCase()),
  );



  
  useEffect(() => {
    if (userId) {
      fetchUsers(userId, setChats).catch(() => {
        setLoadError("Unable to load chats. Please login again.");
      });
    }
  }, [userId]);

  useEffect(() => {
    const refreshUsers = () => {
      if (userId) fetchUsers(userId, setChats);
    };

    socket.on("receiveMessage", refreshUsers);
    socket.on("messageSent", refreshUsers);
    socket.on("messageDelivered", refreshUsers);
    socket.on("messagesSeen", refreshUsers);

    return () => {
      socket.off("receiveMessage", refreshUsers);
      socket.off("messageSent", refreshUsers);
      socket.off("messageDelivered", refreshUsers);
      socket.off("messagesSeen", refreshUsers);
    };
  }, [userId]);

  useEffect(() => {
    if (activeTab === "archive" && userId) {
      fetchArchivedChats(userId, setArchivedChats, setLoading);
    }
  }, [activeTab, userId]);

  useEffect(() => {
    if (userId) {
      axios.get("http://localhost:5001/api/groups")
        .then((response) => setGroups(response.data))
        .catch(() => setGroups([]));
    }
  }, [userId]);

  const createGroup = async (event) => {
    event.preventDefault();
    if (!groupName.trim()) return;

    try {
      const response = await axios.post("http://localhost:5001/api/groups", {
        name: groupName.trim(),
        member_ids: groupMemberIds,
      });
      const createdGroup = { id: response.data.id, name: response.data.name, member_count: groupMemberIds.length + 1 };
      setGroups((current) => [createdGroup, ...current]);
      setGroupName("");
      setGroupMemberIds([]);
      setShowCreateGroup(false);
      setSelectedGroup(createdGroup);
      setSelectedUser(null);
    } catch (error) {
      console.log(error);
    }
  };

  const getArchivedChats = async () => {
  try {
    const res = await axios.get(
      `http://localhost:5001/api/messages/archives?user_id=${user.id}`
    );

    setArchivedChats(res.data);
  } catch (error) {
    console.log("❌ Archive Fetch Error:", error);
  }
};

  const unarchiveChat = async (contactId) => {
    try {
      await axios.delete("http://localhost:5001/api/messages/archive", {
        data: { contact_id: contactId },
      });
      fetchArchivedChats(userId, setArchivedChats, setLoading);
      fetchUsers(userId, setChats);
    } catch (error) {
      console.log(error);
    }
  };

  return (
  <div className="w-full h-full bg-[#102139] flex flex-col">

    {/* ================= CHATS ================= */}
    {activeTab === "chats" && (
      <>
        {/* Header */}
        <div className="p-6 border-b border-slate-700/70">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-[0.18em] mb-2">
            Workspace
          </p>
          <h2 className="text-white text-2xl font-bold tracking-tight">
            Chats
          </h2>

          <p className="text-slate-400 text-sm mt-1">
            Connect with your friends
          </p>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="flex items-center bg-[#172b46] border border-slate-700/70 rounded-2xl px-4 py-3">
            <Search size={18} className="text-slate-400" />

            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent ml-3 w-full outline-none text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loadError && (
            <p className="p-4 text-sm text-red-300">
              {loadError}
            </p>
          )}

          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                console.log("🟢 Clicked User:", chat);
                setSelectedUser(chat);
              }}
              className={`flex items-center gap-3 p-4 transition cursor-pointer border-b border-slate-800 ${
                selectedUser?.id === chat.id
                  ? "bg-slate-800"
                  : "hover:bg-slate-800"
              }`}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xl">
                  {chat.avatar ? (
                    <img src={`http://localhost:5001${chat.avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    chat.name?.charAt(0).toUpperCase()
                  )}
                </div>

                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                    chat.status === "online"
                      ? "bg-green-500"
                      : "bg-gray-500"
                  }`}
                ></span>
              </div>

              {/* Name + Message */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h3 className="text-white font-semibold truncate">
                    {chat.name}
                  </h3>

                  <span className="text-xs text-slate-400">
                    {formatTime(chat.lastTime)}
                  </span>
                </div>

                <p className="text-slate-400 text-sm truncate">
                  {chat.lastMessage || "No messages"}
                </p>
              </div>

              {/* Unread */}
              {chat.unread > 0 && (
                <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {chat.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    )}

    {activeTab === "groups" && (
      <>
        <div className="p-6 border-b border-slate-700/70 flex items-start justify-between">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-[0.18em] mb-2">Community</p>
            <h2 className="text-white text-2xl font-bold tracking-tight">Groups</h2>
            <p className="text-slate-400 text-sm mt-1">Shared conversations</p>
          </div>
          <button type="button" title="Create group" onClick={() => setShowCreateGroup(true)} className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"><Plus size={19} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {groups.map((group) => (
            <button key={group.id} type="button" onClick={() => { setSelectedGroup(group); setSelectedUser(null); }} className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left mb-2 ${selectedGroup?.id === group.id ? "bg-slate-800" : "hover:bg-slate-800/70"}`}>
              <span className="w-11 h-11 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-300"><UsersRound size={19} /></span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-white text-sm">{group.name}</strong><small className="text-slate-500">{group.member_count} members</small></span>
            </button>
          ))}
          {groups.length === 0 && <p className="p-4 text-sm text-slate-500">No groups yet. Create your first group.</p>}
        </div>
      </>
    )}



{/* ================= CONTACTS ================= */}
{activeTab === "contacts" && (
  <>
    {/* Contacts Header */}
    <div className="p-5 border-b border-slate-800">
      <h2 className="text-white text-2xl font-bold">
        Contacts
      </h2>

      <p className="text-slate-400 text-sm">
        Find people to chat with
      </p>
    </div>

{/* Contacts Search */}
<div className="p-4">
  <div className="flex items-center bg-slate-800 rounded-xl px-4 py-3">
    <Search size={18} className="text-slate-400" />

    <input
      type="text"
      placeholder="Search contacts..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="bg-transparent ml-3 w-full outline-none text-white placeholder-slate-400"
    />
  </div>
</div>



    {/* Contacts List */}
    <div className="flex-1 overflow-y-auto">

     {chats
  .filter((contact) =>
    contact.name?.toLowerCase().includes(search.toLowerCase())
  )
  .map((contact) => (
        <div
          key={contact.id}
          onClick={() => {
            console.log("🟢 Contact Selected:", contact);

            setSelectedUser(contact);

            // Contact select hone ke baad Chats tab par aa jayega
            setActiveTab("chats");
          }}
          className="flex items-center gap-3 p-4 cursor-pointer border-b border-slate-800 hover:bg-slate-800 transition"
        >

          {/* Avatar */}
          <div className="relative">

            <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xl">
              {contact.avatar ? (
                <img src={`http://localhost:5001${contact.avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                contact.name?.charAt(0).toUpperCase()
              )}
            </div>

            {/* Online Status */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                contact.status === "online"
                  ? "bg-green-500"
                  : "bg-gray-500"
              }`}
            ></span>

          </div>

          {/* Name */}
          <div className="flex-1">

            <h3 className="text-white font-semibold">
              {contact.name}
            </h3>

            <p className="text-sm text-slate-400">
              {contact.status === "online"
                ? "Online"
                : "Offline"}
            </p>

          </div>

        </div>
      ))}

    </div>
  </>
)}

    {/* ================= ARCHIVE ================= */}
    {activeTab === "archive" && (
      <>
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-white text-2xl font-bold">
            Archived Chats
          </h2>

      <p className="text-slate-400 text-sm">
        Your archived conversations
      </p>
    </div>

        <div className="flex-1 p-5">
          <p className="text-slate-400">
            Archived chats will be added later.
          </p>
        </div>
      </>
    )}

    {/* ================= SETTINGS ================= */}
    {activeTab === "settings" && (
      <>
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-white text-2xl font-bold">
            Settings
          </h2>

          <p className="text-slate-400 text-sm">
            Manage your chat settings
          </p>
        </div>

        <div className="flex-1 p-5">
          <p className="text-slate-400">
            Settings will be added later.
          </p>
        </div>
      </>
    )}

    {/* ================= BOTTOM MENU ================= */}
    <div className="border-t border-slate-800 p-4 flex justify-around">

      {/* Chats */}
      <button
        type="button"
     onClick={() => {
  setActiveTab("chats");
  setSelectedUser(null);
}}
        className={`w-12 h-10 flex items-center justify-center rounded-lg transition ${
          activeTab === "chats"
            ? "bg-slate-800 text-white"
            : "text-slate-400 hover:bg-slate-600 hover:text-white"
        }`}
        title="Chats"
      >
        <MessageCircle size={24} />
      </button>

      {/* Contacts */}
      <button
        type="button"
        onClick={() => setActiveTab("contacts")}
        className={`w-12 h-10 flex items-center justify-center rounded-lg transition ${
          activeTab === "contacts"
            ? "bg-slate-800 text-white"
            : "text-slate-400 hover:bg-slate-600 hover:text-white"
        }`}
        title="Contacts"
      >
        <Users size={24} />
      </button>

      <button
        type="button"
        onClick={() => { setSelectedUser(null); setActiveTab("groups"); }}
        className={`w-12 h-10 flex items-center justify-center rounded-lg transition ${activeTab === "groups" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-600 hover:text-white"}`}
        title="Groups"
      >
        <UsersRound size={24} />
      </button>

      {/* Archive */}
      <button
  type="button"
 onClick={() => {
  setActiveTab("archive");
  getArchivedChats();
}}
  className={`w-12 h-10 flex items-center justify-center rounded-lg transition ${
    activeTab === "archive"
      ? "bg-slate-800 text-white"
      : "text-slate-400 hover:bg-slate-600 hover:text-white"
  }`}
  title="Archive"
>
  <Archive size={24} />
</button>

      {/* Settings */}
      <button
        type="button"
        onClick={() => setActiveTab("settings")}
        className={`w-12 h-10 flex items-center justify-center rounded-lg transition ${
          activeTab === "settings"
            ? "bg-slate-800 text-white"
            : "text-slate-400 hover:bg-slate-600 hover:text-white"
        }`}
        title="Settings"
      >
        <Settings size={24} />
      </button>

    </div>

    {showCreateGroup && (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <form onSubmit={createGroup} className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#102139] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5"><div><p className="text-emerald-300 text-xs uppercase tracking-[0.18em] font-semibold">Community</p><h2 className="text-white text-2xl font-semibold mt-2">Create group</h2></div><button type="button" title="Close" onClick={() => setShowCreateGroup(false)} className="p-2 text-slate-400 hover:text-white"><X size={19} /></button></div>
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" className="w-full rounded-xl border border-slate-700 bg-[#172b46] px-4 py-3 text-white outline-none focus:border-emerald-400/60" />
          <p className="text-slate-400 text-sm mt-5 mb-2">Add members</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {chats.map((chat) => <label key={chat.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-800 text-sm text-white"><input type="checkbox" checked={groupMemberIds.includes(chat.id)} onChange={(event) => setGroupMemberIds((current) => event.target.checked ? [...current, chat.id] : current.filter((id) => id !== chat.id))} />{chat.name}</label>)}
          </div>
          <button type="submit" className="mt-5 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-[#062016] hover:bg-emerald-400">Create group</button>
        </form>
      </div>
    )}

  </div>
);
}
