import { io } from "socket.io-client";

// Socket Connection
const socket = io("http://localhost:5001", {
  autoConnect: true,
  transports: ["websocket"],
});

// Connected
socket.on("connect", () => {
  console.log("✅ Socket Connected:", socket.id);
});

// Disconnected
socket.on("disconnect", () => {
  console.log("❌ Socket Disconnected");  
});

export default socket;