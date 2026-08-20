import { useEffect, useRef, useState } from "react";
import { Mic, Camera, Wifi, CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";

function statusIcon(state) {
  if (state === "checking") return <Loader2 className="w-4 h-4 animate-spin text-slate-soft" />;
  if (state === "ok") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (state === "warn") return <ShieldAlert className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-crimson" />;
}

export default function PreJoinCheck({ title, subtitle, opensAt, onAllow, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);

  const [camState, setCamState] = useState("checking"); 
  const [micState, setMicState] = useState("checking");
  const [micLevel, setMicLevel] = useState(0);
  const [netState, setNetState] = useState("checking"); 
  const [netLabel, setNetLabel] = useState("Checking your connection…");
  const [errorMsg, setErrorMsg] = useState("");
  const [joining, setJoining] = useState(false);
  // Set only when Allow was clicked before the 10-minute-before window
  // opened - devices already passed, this is purely the time gate.
  const [tooEarly, setTooEarly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function requestDevices() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamState(stream.getVideoTracks().length > 0 ? "ok" : "error");
        setMicState(stream.getAudioTracks().length > 0 ? "ok" : "error");

        
        
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx && stream.getAudioTracks().length > 0) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setMicLevel(Math.min(100, Math.round((avg / 255) * 180)));
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        }
      } catch (err) {
        if (cancelled) return;
        setCamState("error");
        setMicState("error");
        setErrorMsg(
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Camera and microphone access was blocked. Allow both in your browser's site settings, then try again."
            : "Couldn't access your camera or microphone. Make sure no other app is using them and try again."
        );
      }
    }

    requestDevices();

    
    
    
    const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    if (conn) {
      const downlink = conn.downlink; 
      if (typeof downlink === "number") {
        if (downlink >= 1.5) {
          setNetState("ok");
          setNetLabel(`Good connection (~${downlink} Mbps)`);
        } else if (downlink >= 0.5) {
          setNetState("warn");
          setNetLabel(`Slow connection (~${downlink} Mbps) - video may lag`);
        } else {
          setNetState("warn");
          setNetLabel(`Very slow connection (~${downlink} Mbps) - consider switching networks`);
        }
      } else {
        setNetState("ok");
        setNetLabel(conn.effectiveType ? `Connection: ${conn.effectiveType}` : "Connection looks fine");
      }
    } else {
      setNetState("ok");
      setNetLabel("Your browser can't report connection speed - the call will adapt automatically once connected.");
    }

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const devicesReady = camState === "ok" && micState === "ok";

  const handleAllow = () => {
    if (!devicesReady || !streamRef.current) return;
    
    
    
    if (opensAt && Date.now() < opensAt) {
      setTooEarly(true);
      return;
    }
    setTooEarly(false);
    setJoining(true);
    
    
    onAllow(streamRef.current);
  };

  
  
  
  useEffect(() => {
    if (!tooEarly || !opensAt) return;
    const id = setInterval(() => {
      if (Date.now() >= opensAt) setTooEarly(false);
    }, 15000);
    return () => clearInterval(id);
  }, [tooEarly, opensAt]);

  const handleCancel = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  const handleRetry = () => {
    setCamState("checking");
    setMicState("checking");
    setErrorMsg("");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamState("ok");
        setMicState("ok");
      })
      .catch(() => {
        setCamState("error");
        setMicState("error");
        setErrorMsg("Still blocked. Check your browser's camera/microphone permission for this site, then retry.");
      });
  };

  return (
    <div className="rounded-2xl border border-mist bg-white p-5 sm:p-6 space-y-5">
      <div>
        <p className="text-sm font-semibold text-ink">{title || "Check your camera and microphone"}</p>
        <p className="mt-0.5 text-xs text-slate-soft">{subtitle || "We'll ask for camera and microphone access before you join the meeting."}</p>
      </div>

      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-void">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {camState !== "ok" && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            {camState === "checking" ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-ink"><Camera className="w-4 h-4 text-slate-soft" /> Camera</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            {statusIcon(camState)} {camState === "checking" ? "Checking…" : camState === "ok" ? "Working" : "Blocked"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-ink"><Mic className="w-4 h-4 text-slate-soft" /> Microphone</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            {statusIcon(micState)} {micState === "checking" ? "Checking…" : micState === "ok" ? "Working" : "Blocked"}
          </span>
        </div>
        {micState === "ok" && (
          <div className="h-1.5 w-full rounded-full bg-mist overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-100" style={{ width: `${micLevel}%` }} />
          </div>
        )}
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-ink"><Wifi className="w-4 h-4 text-slate-soft" /> Connection</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-right">{statusIcon(netState)} {netLabel}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 space-y-2">
          <p>{errorMsg}</p>
          <button onClick={handleRetry} className="font-semibold underline underline-offset-2">Try again</button>
        </div>
      )}

      {tooEarly && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800">
          You can join before 10 mins only — the meeting opens at{" "}
          <span className="font-semibold">
            {new Date(opensAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </span>
          . Your camera and mic are ready, come back closer to your slot.
        </div>
      )}

      <p className="text-xs text-slate-soft">
        Your camera and microphone are only shared with your {subtitle ? "doctor" : "consultation"} once you join, and are never recorded or stored.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleAllow}
          disabled={!devicesReady || joining}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {joining && <Loader2 className="w-4 h-4 animate-spin" />} Allow & join meeting
        </button>
      </div>
    </div>
  );
}
