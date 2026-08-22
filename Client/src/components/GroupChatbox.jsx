import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { ArrowLeft, Send, UsersRound } from "lucide-react";
import socket from "../Socket";
import { useToast } from "./useToast";

export default function GroupChatbox({ group, onBack }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();

  const loadGroupMessages = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/groups/${group.id}/messages`,
      );
      setMessages(response.data.messages);
    } catch (error) {
      showToast(error.response?.data?.message || "Could not load group messages.", "error");
    }
  }, [group.id, showToast]);

  useEffect(() => {
    const loadTimer = setTimeout(() => loadGroupMessages(), 0);
    axios.get(`http://localhost:5001/api/groups/${group.id}/members`)
      .then((response) => setMembers(response.data))
      .catch(() => setMembers([]));

    socket.emit("joinGroup", group.id);
    const handleGroupMessage = (newMessage) => {
      if (Number(newMessage.group_id) === Number(group.id)) {
        setMessages((current) => current.some((item) => item.id === newMessage.id)
          ? current
          : [...current, newMessage]);
      }
    };
    socket.on("groupMessage", handleGroupMessage);

    return () => {
      clearTimeout(loadTimer);
      socket.emit("leaveGroup", group.id);
      socket.off("groupMessage", handleGroupMessage);
    };
  }, [group.id, loadGroupMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    try {
      const response = await axios.post(
        `http://localhost:5001/api/groups/${group.id}/messages`,
        { message: text },
      );
      setMessages((current) => [...current, response.data]);
      socket.emit("groupMessage", response.data);
      setMessage("");
    } catch (error) {
      showToast(error.response?.data?.message || "Message could not be sent.", "error");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#07111f]">
      <header className="h-20 shrink-0 px-4 md:px-7 border-b border-slate-700/70 flex items-center justify-between bg-[#0d1a2b]">
        <div className="flex items-center gap-3">
          <button type="button" title="Back to chats" onClick={onBack} className="md:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-300">
            <UsersRound size={22} />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">{group.name}</h2>
            <p className="text-slate-500 text-sm">{members.length || group.member_count} members</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 md:p-7">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <UsersRound className="mx-auto text-emerald-300 mb-3" size={32} />
              <p className="text-white font-semibold">Start the group conversation</p>
              <p className="text-slate-500 text-sm mt-1">Everyone in {group.name} can see these messages.</p>
            </div>
          </div>
        )}
        {messages.map((item) => {
          const isMine = Number(item.sender_id) === Number(user?.id);
          return (
            <div key={item.id} className={`flex mb-4 ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMine ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"}`}>
                {!isMine && <p className="text-emerald-300 text-xs font-semibold mb-1">{item.senderName}</p>}
                <p className="text-sm break-words">{item.message}</p>
                <p className="text-[10px] opacity-60 text-right mt-2">{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-slate-800 bg-[#0d1a2b] flex items-center gap-3">
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message ${group.name}...`} className="flex-1 rounded-xl bg-[#172b46] border border-slate-700 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-400/60" />
        <button type="submit" title="Send message" className="rounded-xl bg-emerald-500 p-3 text-[#062016] hover:bg-emerald-400"><Send size={19} /></button>
      </form>
    </div>
  );
}
