import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, WifiOff, MessageCircle, X, Send } from "lucide-react";
import { getSocket } from "../../utils/socket.js";

const STUN_SERVERS = [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }];

const DEFAULT_TURN_SERVER = {
  urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"],
  username: "openrelayproject",
  credential: "openrelayproject",
};

function buildIceServers() {
  const servers = [...STUN_SERVERS];
  const turnUrls = (import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  if (turnUrls.length > 0) {
    servers.push({
      urls: turnUrls,
      username: import.meta.env.VITE_TURN_USERNAME || undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined,
    });
  } else {
    // No TURN configured for this deployment - fall back to the shared
    // free relay rather than leaving calls unable to connect at all.
    servers.push(DEFAULT_TURN_SERVER);
  }
  return servers;
}

const ICE_SERVERS = buildIceServers();

// How long we let a connection attempt sit in "connecting"/"waiting" before

const CONNECT_TIMEOUT_MS = 20000;

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatClockTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

// One WebRTC video/audio call, signaled entirely over the app's existing
// Socket.IO connection (see server.js's `consultation:*` handlers). Video
// and audio are peer-to-peer once connected - nothing here ever uploads,
// records, or stores the media stream; only signaling metadata (SDP/ICE)
// passes through the server, and only between the two authenticated
// sockets that already proved they belong to this exact appointment. The
// in-call text chat rides the same relay and is just as ephemeral - the
// server never writes it to the database, only forwards it live.
export default function VideoCallPanel({ appointmentId, myRole, myName, peerName, onPeerLeft, onHangup, initialStream }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const isInitiatorRef = useRef(false); // true once we've seen a peer join while we were already here
  const chatEndRef = useRef(null);
  const chatOpenRef = useRef(false);
  const connectTimeoutRef = useRef(null);

  const [status, setStatus] = useState("connecting"); 
  const [error, setError] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [retryKey, setRetryKey] = useState(0); // bump to fully tear down and re-attempt the connection

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [chatDraft, setChatDraft] = useState("");

  const socket = getSocket();
  const otherLabel = peerName || (myRole === "doctor" ? "Patient" : "Doctor");
  const selfLabel = myName || "You";

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit("consultation:signal", { appointmentId, data: { candidate: e.candidate } });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
      clearTimeout(connectTimeoutRef.current);
      setStatus("connected");
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        clearTimeout(connectTimeoutRef.current);
        return;
      }
      if (pc.connectionState === "failed") {
        
        
        
        setError(
"Couldn't establish the call. Check your internet connection and try again - if this keeps happening, your deployment may need its own TURN server (see frontend/.env.local.example).");
        setStatus("error");
      } else if (pc.connectionState === "disconnected") {
        setStatus((s) => (s === "connected" ? "connecting" : s));
      }
    };

    return pc;
  }, [appointmentId, socket]);

  const makeOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket?.emit("consultation:signal", { appointmentId, data: { sdp: offer } });
  }, [appointmentId, socket]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        setError("");
        setStatus("connecting");
        isInitiatorRef.current = false;
        
        
        
        
        const stream =
          (retryKey === 0 && initialStream) || (await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pcRef.current = pc;

        setStatus("waiting-for-peer");
        socket?.emit("consultation:join-room", { appointmentId });
      } catch (err) {
        setError(
          err.name === "NotAllowedError"
            ? "Camera/microphone access was denied. Allow access in your browser and reload."
            : "Could not access your camera/microphone."
        );
        setStatus("error");
      }
    }

    setup();

    const handlePeerJoined = () => {
      
      
      
      isInitiatorRef.current = true;
      makeOffer();
      
      
      
      
      
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = setTimeout(() => {
        if (pcRef.current && pcRef.current.connectionState !== "connected") {
          setError(
"Couldn't establish the call. Check your internet connection and try again - if this keeps happening, your deployment may need its own TURN server (see frontend/.env.local.example).");
          setStatus("error");
        }
      }, CONNECT_TIMEOUT_MS);
    };

    const handleSignal = async ({ data }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        if (data.sdp) {
          if (data.sdp.type === "offer") {
            
            
            
            clearTimeout(connectTimeoutRef.current);
            connectTimeoutRef.current = setTimeout(() => {
              if (pcRef.current && pcRef.current.connectionState !== "connected") {
                setError(
"Couldn't establish the call. Check your internet connection and try again - if this keeps happening, your deployment may need its own TURN server (see frontend/.env.local.example).");
                setStatus("error");
              }
            }, CONNECT_TIMEOUT_MS);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket?.emit("consultation:signal", { appointmentId, data: { sdp: answer } });
          }
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("WebRTC signal handling error:", err);
      }
    };

    const handlePeerLeft = () => {
      setStatus("waiting-for-peer");
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      onPeerLeft?.();
    };

    const handleConsultationError = ({ error: msg }) => {
      setError(msg || "Could not join the consultation room.");
      setStatus("error");
    };

    const handleChatMessage = (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      if (message.role === myRole) return; 
      if (!chatOpenRef.current) setUnread((n) => n + 1);
    };

    socket?.on("consultation:peer-joined", handlePeerJoined);
    socket?.on("consultation:signal", handleSignal);
    socket?.on("consultation:peer-left", handlePeerLeft);
    socket?.on("consultation:error", handleConsultationError);
    socket?.on("consultation:chat-message", handleChatMessage);

    return () => {
      cancelled = true;
      clearTimeout(connectTimeoutRef.current);
      socket?.off("consultation:peer-joined", handlePeerJoined);
      socket?.off("consultation:signal", handleSignal);
      socket?.off("consultation:peer-left", handlePeerLeft);
      socket?.off("consultation:error", handleConsultationError);
      socket?.off("consultation:chat-message", handleChatMessage);
      socket?.emit("consultation:leave-room", { appointmentId });
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    
  }, [appointmentId, retryKey]);

  
  useEffect(() => {
    if (status !== "connected") return;
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  const sendChat = (e) => {
    e.preventDefault();
    const text = chatDraft.trim();
    if (!text) return;
    socket?.emit("consultation:chat-message", { appointmentId, text });
    setChatDraft("");
  };

  if (status === "error") {
    return (
      <div className="rounded-2xl bg-void p-10 text-center text-white/80">
        <WifiOff className="w-8 h-8 mx-auto mb-3 text-crimson" />
        <p className="text-sm max-w-sm mx-auto">{error}</p>
        <button
          onClick={() => setRetryKey((k) => k + 1)}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
        >
          Retry connection
        </button>
        {onHangup && (
          <button onClick={onHangup} className="mt-3 block w-full text-xs text-white/50 hover:text-white/80 transition-colors">
            Leave call
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <div className="relative flex-1 min-w-0 rounded-2xl overflow-hidden bg-void aspect-video">
        {}
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />

        {status !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 bg-gradient-to-b from-void via-void/95 to-void">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-white/80 ring-1 ring-white/15">
              {initialOf(otherLabel)}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/90">
                {status === "connecting" ? "Setting up your camera…" : `Waiting for ${otherLabel.toLowerCase()} to join…`}
              </p>
              {status === "waiting-for-peer" && (
                <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-white/50">
                  <Loader2 className="w-3 h-3 animate-spin" /> You're connected and ready
                </p>
              )}
            </div>
          </div>
        )}

        {}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <span className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
            <span className="text-sm font-semibold">{otherLabel}</span>
          </div>
          {status === "connected" && (
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white/85 tabular-nums">
              {formatDuration(elapsed)}
            </span>
          )}
        </div>

        {}
        <div className="absolute top-14 right-3 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border border-white/20 bg-black shadow-lg">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-void text-white/50">
              <VideoOff className="w-5 h-5" />
            </div>
          )}
          <span className="absolute bottom-1 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/85">
            {selfLabel}
          </span>
        </div>

        {}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button
            onClick={toggleMic}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${micOn ? "bg-white/15 text-white hover:bg-white/25" : "bg-crimson text-white"}`}
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          >
            {micOn ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
          </button>
          <button
            onClick={toggleCam}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${camOn ? "bg-white/15 text-white hover:bg-white/25" : "bg-crimson text-white"}`}
            aria-label={camOn ? "Turn off camera" : "Turn on camera"}
          >
            {camOn ? <Video className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
          </button>
          <button
            onClick={() => setChatOpen((v) => !v)}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors ${chatOpen ? "bg-white text-void" : "bg-white/15 text-white hover:bg-white/25"}`}
            aria-label={chatOpen ? "Close chat" : "Open chat"}
          >
            <MessageCircle className="w-4.5 h-4.5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-crimson px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {onHangup && (
            <button
              onClick={onHangup}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-crimson text-white hover:bg-crimson-dark transition-colors"
              aria-label="Leave call"
            >
              <PhoneOff className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {}
      {chatOpen && (
        <div className="flex flex-col w-full lg:w-72 shrink-0 rounded-2xl border border-mist bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-mist px-3.5 py-2.5">
            <span className="text-sm font-semibold text-ink">In-call chat</span>
            <button onClick={() => setChatOpen(false)} className="text-slate-soft hover:text-ink transition-colors" aria-label="Close chat">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-[220px] max-h-80 lg:max-h-none overflow-y-auto px-3.5 py-3 space-y-2.5">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-soft text-center pt-6">No messages yet - say hello.</p>
            ) : (
              messages.map((m) => {
                const mine = m.role === myRole;
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-crimson text-white rounded-br-sm" : "bg-mist text-ink rounded-bl-sm"}`}>
                      {m.text}
                    </div>
                    <span className="mt-0.5 text-[10px] text-slate-soft/80">{formatClockTime(m.at)}</span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendChat} className="flex items-center gap-2 border-t border-mist p-2.5">
            <input
              type="text"
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Type a message…"
              maxLength={2000}
              className="flex-1 rounded-full border border-slate-200 bg-mist/40 px-3.5 py-2 text-sm focus:border-crimson/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatDraft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson text-white hover:bg-crimson-dark disabled:opacity-40 transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
