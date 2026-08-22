import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import socket from "../Socket";
import { useToast } from "./useToast";

export default function CallPanel({ selectedUser }) {
  const [call, setCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteDescriptionReadyRef = useRef(false);
  const { showToast } = useToast();

  const stopMedia = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    pendingCandidatesRef.current = [];
    remoteDescriptionReadyRef.current = false;
    setCall(null);
  };

  const createPeer = (targetId, type, callId = null) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("callIceCandidate", { to: targetId, candidate: event.candidate });
      }
    };
    peer.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
    };
    setCall({ targetId, type, callId });
    return peer;
  };

  const startCall = async (type) => {
    if (!selectedUser) {
      showToast("Select a chat before starting a call.", "info");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      localStreamRef.current = stream;
      const peer = createPeer(selectedUser.id, type);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peerRef.current = peer;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("callOffer", { to: selectedUser.id, offer, type });
    } catch {
      showToast("Camera or microphone permission is required for calls.", "error");
    }
  };

  useEffect(() => {
    const handleOffer = (data) => setIncomingCall(data);
    const handleStarted = (data) => setCall((current) => current ? { ...current, callId: data.call_id } : current);
    const handleAnswer = async (data) => {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      remoteDescriptionReadyRef.current = true;
      for (const candidate of pendingCandidatesRef.current) {
        await peerRef.current.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];
    };
    const handleCandidate = async (data) => {
      const candidate = new RTCIceCandidate(data.candidate);
      if (peerRef.current && remoteDescriptionReadyRef.current) {
        await peerRef.current.addIceCandidate(candidate);
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };
    const handleEnd = () => {
      stopMedia();
      setIncomingCall(null);
    };

    socket.on("callOffer", handleOffer);
    socket.on("callStarted", handleStarted);
    socket.on("callAnswer", handleAnswer);
    socket.on("callIceCandidate", handleCandidate);
    socket.on("callEnd", handleEnd);

    return () => {
      socket.off("callOffer", handleOffer);
      socket.off("callStarted", handleStarted);
      socket.off("callAnswer", handleAnswer);
      socket.off("callIceCandidate", handleCandidate);
      socket.off("callEnd", handleEnd);
      pendingCandidatesRef.current = [];
      remoteDescriptionReadyRef.current = false;
      stopMedia();
    };
  }, []);

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingCall.type === "video" });
      localStreamRef.current = stream;
      const peer = createPeer(incomingCall.from, incomingCall.type, incomingCall.call_id);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peerRef.current = peer;
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      remoteDescriptionReadyRef.current = true;
      for (const candidate of pendingCandidatesRef.current) {
        await peer.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("callAnswer", { to: incomingCall.from, answer, call_id: incomingCall.call_id });
      setIncomingCall(null);
    } catch {
      showToast("Could not accept the call.", "error");
    }
  };

  const endCall = () => {
    if (call?.targetId) socket.emit("callEnd", { to: call.targetId, call_id: call.callId });
    stopMedia();
    setIncomingCall(null);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button type="button" title="Audio call" onClick={() => startCall("audio")} className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"><Phone size={20} /></button>
        <button type="button" title="Video call" onClick={() => startCall("video")} className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"><Video size={20} /></button>
      </div>

      {(call || incomingCall) && (
        <div className="fixed inset-0 z-[150] bg-[#030914]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-[#102139] p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4"><h2 className="text-white font-semibold">{incomingCall ? "Incoming call" : `Calling ${selectedUser?.name || "user"}`}</h2><button type="button" title="End call" onClick={endCall} className="p-2 rounded-xl bg-rose-500/15 text-rose-300"><PhoneOff size={19} /></button></div>
            {incomingCall ? <div className="flex gap-3"><button type="button" onClick={acceptCall} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-[#062016]">Accept</button><button type="button" onClick={endCall} className="flex-1 rounded-xl bg-rose-500/20 py-3 font-semibold text-rose-200">Decline</button></div> : call?.type === "video" ? <video ref={remoteVideoRef} autoPlay playsInline className="w-full aspect-video rounded-2xl bg-black object-cover" /> : <><div className="rounded-2xl bg-black/30 py-12 text-center text-slate-300">Audio call active</div><audio ref={remoteAudioRef} autoPlay controls className="mt-4 w-full" /></>}
          </div>
        </div>
      )}
    </>
  );
}
