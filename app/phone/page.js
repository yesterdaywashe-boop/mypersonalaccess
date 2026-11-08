"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getClient, genCode, newId, channelName } from "../../lib/remote";

const QUALITY = {
  low: { w: 320, q: 0.4, ms: 1200, label: "Low (slow net)" },
  med: { w: 480, q: 0.5, ms: 800, label: "Medium" },
  high: { w: 640, q: 0.65, ms: 600, label: "High" },
};

const PERM_LABELS = {
  camera: "📷 Camera",
  mic: "🎙️ Microphone",
  location: "📍 Location",
  notification: "🔔 Notifications",
};

export default function PhonePage() {
  const [code, setCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [perms, setPerms] = useState({ camera: "—", mic: "—", location: "—", notification: "—" });
  const [camOn, setCamOn] = useState(false);
  const [locOn, setLocOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [facing, setFacing] = useState("environment");
  const [quality, setQuality] = useState("med");
  const [frames, setFrames] = useState(0);
  const [lastLoc, setLastLoc] = useState(null);
  const [dashSeen, setDashSeen] = useState(false);
  const [status, setStatus] = useState("Not connected");
  const [log, setLog] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioRef = useRef({ ctx: null, analyser: null, raf: 0 });
  const watchRef = useRef(null);
  const frameTimerRef = useRef(null);
  const hbTimerRef = useRef(null);
  const channelRef = useRef(null);
  const wakeRef = useRef(null);
  const myIdRef = useRef(newId());
  const framesRef = useRef(0);
  const lastLocSentRef = useRef(0);
  const facingRef = useRef("environment");
  const qualityRef = useRef("med");
  const camOnRef = useRef(false);
  const locOnRef = useRef(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = (p.get("code") || "").toUpperCase();
    if (c) setCode(c);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addLog(t) {
    setLog((prev) => [...prev.slice(-29), new Date().toLocaleTimeString() + " — " + t]);
  }

  function send(type, payload) {
    const ch = channelRef.current;
    if (!ch) return;
    payload = payload || {};
    payload.by = myIdRef.current;
    payload.role = "phone";
    ch.send({ type: "broadcast", event: "remote", payload: { type, data: payload } });
  }

  function setPerm(key, val) {
    setPerms((p) => ({ ...p, [key]: val }));
  }

  async function requestAll() {
    addLog("Permissions mang rahe hain — har ek par Allow dabao...");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach((t) => t.stop());
      setPerm("camera", "granted");
    } catch (e) {
      setPerm("camera", "denied");
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setPerm("mic", "granted");
    } catch (e) {
      setPerm("mic", "denied");
    }
    try {
      await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      );
      setPerm("location", "granted");
    } catch (e) {
      setPerm("location", "denied");
    }
    try {
      const r = await Notification.requestPermission();
      setPerm("notification", r);
    } catch (e) {
      setPerm("notification", "denied");
    }
    addLog("Permissions check mukammal.");
  }

  async function sendInfo() {
    const info = {
      ua: navigator.userAgent || "—",
      screen: window.screen.width + "x" + window.screen.height,
      lang: navigator.language || "—",
      online: navigator.onLine ? "Online" : "Offline",
    };
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        info.battery = Math.round(b.level * 100) + "%" + (b.charging ? " (charging)" : "");
      }
    } catch (e) {}
    try {
      if (navigator.connection) {
        info.net = (navigator.connection.effectiveType || "") + " " + (navigator.connection.type || "");
      }
    } catch (e) {}
    send("info", info);
    addLog("Device info bheji.");
  }

  async function startCam() {
    if (camOnRef.current) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingRef.current, width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      camOnRef.current = true;
      setCamOn(true);
      const q = QUALITY[qualityRef.current];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      frameTimerRef.current = setInterval(() => {
        const v = videoRef.current;
        if (!camOnRef.current || !s || !v || v.readyState < 2) return;
        try {
          const scale = q.w / v.videoWidth;
          canvas.width = q.w;
          canvas.height = Math.round(v.videoHeight * scale);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const img = canvas.toDataURL("image/jpeg", q.q);
          send("cam", { img, ts: Date.now() });
          framesRef.current++;
          setFrames(framesRef.current);
        } catch (e) {}
      }, q.ms);
      addLog("📷 Camera ON (" + (facingRef.current === "environment" ? "Back" : "Front") + ")");
    } catch (e) {
      setPerm("camera", "denied");
      addLog("❌ Camera permission nahi mili: " + e.name);
    }
  }

  function stopCam() {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (camOnRef.current) {
      camOnRef.current = false;
      addLog("📷 Camera band.");
    }
    setCamOn(false);
  }

  function startLoc() {
    if (locOnRef.current || !navigator.geolocation) {
      if (!navigator.geolocation) addLog("❌ Is browser mein location nahi milti.");
      return;
    }
    locOnRef.current = true;
    setLocOn(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastLocSentRef.current < 2000) return;
        lastLocSentRef.current = now;
        const l = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: Math.round(pos.coords.accuracy || 0),
          ts: now,
        };
        setLastLoc(l);
        send("loc", l);
      },
      (e) => {
        addLog("❌ Location permission nahi mili: " + e.message);
        setPerm("location", "denied");
        locOnRef.current = false;
        setLocOn(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    addLog("📍 Location ON.");
  }

  function stopLoc() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (locOnRef.current) {
      locOnRef.current = false;
      addLog("📍 Location band.");
    }
    setLocOn(false);
  }

  async function startMic() {
    if (micStreamRef.current) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = s;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      audioRef.current = { ctx, analyser: an, raf: 0 };
      setMicOn(true);
      const data = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        an.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setMicLevel(Math.min(100, Math.round(rms * 300)));
        audioRef.current.raf = requestAnimationFrame(loop);
      };
      loop();
      addLog("🎙️ Mic ON (level meter live).");
    } catch (e) {
      setPerm("mic", "denied");
      addLog("❌ Mic permission nahi mili: " + e.name);
    }
  }

  function stopMic() {
    if (audioRef.current.raf) cancelAnimationFrame(audioRef.current.raf);
    if (audioRef.current.ctx) {
      try {
        audioRef.current.ctx.close();
      } catch (e) {}
    }
    audioRef.current = { ctx: null, analyser: null, raf: 0 };
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setMicOn(false);
    setMicLevel(0);
  }

  function ringPhone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      o.type = "sine";
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      o.stop(ctx.currentTime + 1.5);
    } catch (e) {}
    try {
      if (navigator.vibrate) navigator.vibrate([300, 200, 300, 200, 500]);
    } catch (e) {}
    addLog("🔔 Dashboard ne Ring bajaya!");
  }

  function onMsg(type, d) {
    if (type === "cmd") {
      if (d.action === "stop-cam") stopCam();
      else if (d.action === "stop-loc") stopLoc();
      else if (d.action === "stop-all") stopAll();
      else if (d.action === "ring") ringPhone();
    } else if (type === "hello") {
      send("hello", {});
      sendInfo();
    }
  }

  function stopAll() {
    stopCam();
    stopLoc();
    send("bye", {});
    addLog("⛔ Sharing band kar di.");
  }

  function disconnect() {
    stopCam();
    stopLoc();
    stopMic();
    if (hbTimerRef.current) {
      clearInterval(hbTimerRef.current);
      hbTimerRef.current = null;
    }
    if (wakeRef.current) {
      try {
        wakeRef.current.release();
      } catch (e) {}
      wakeRef.current = null;
    }
    const ch = channelRef.current;
    if (ch) {
      try {
        getClient().removeChannel(ch);
      } catch (e) {}
      channelRef.current = null;
    }
    framesRef.current = 0;
    setFrames(0);
    setLastLoc(null);
    setConnected(false);
    setConnecting(false);
    setDashSeen(false);
    setStatus("Not connected");
  }

  async function connect() {
    const c = code.trim().toUpperCase();
    if (!c) {
      setError("Room Code daalo ya Random dabao.");
      return;
    }
    setConnecting(true);
    setError("");
    const sb = getClient();
    const ch = sb.channel(channelName(c));
    channelRef.current = ch;
    ch.on("broadcast", { event: "remote" }, (msg) => {
      const p = msg.payload || {};
      if (!p.data || p.data.by === myIdRef.current) return;
      onMsg(p.type, p.data);
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      let dash = false;
      Object.keys(state).forEach((k) =>
        state[k].forEach((pr) => {
          if (pr.role === "dashboard") dash = true;
        })
      );
      setDashSeen(dash);
      if (dash) {
        setStatus("✅ Dashboard jud gaya — sharing live hai");
        addLog("Dashboard jud gaya.");
      }
    });
    ch.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        setError("Room se connect nahi ho paya — internet check karo aur dobara try karo.");
        setConnecting(false);
        return;
      }
      await ch.track({ id: myIdRef.current, role: "phone" });
      setConnected(true);
      setConnecting(false);
      setStatus("Room ban gaya! Sharing start ho rahi hai...");
      send("hello", {});
      sendInfo();
      startCam();
      startLoc();
      startMic();
      hbTimerRef.current = setInterval(() => send("hb", { ts: Date.now() }), 5000);
      try {
        wakeRef.current = await navigator.wakeLock.request("screen");
      } catch (e) {}
      addLog("Connected — Room " + c);
    });
  }

  async function flipCamera() {
    const next = facingRef.current === "environment" ? "user" : "environment";
    facingRef.current = next;
    setFacing(next);
    if (camOnRef.current) {
      stopCam();
      await startCam();
    }
    addLog("Camera flip: " + (next === "environment" ? "Back" : "Front"));
  }

  function changeQuality(v) {
    qualityRef.current = v;
    setQuality(v);
    if (camOnRef.current) {
      stopCam();
      startCam();
    }
    addLog("Quality: " + QUALITY[v].label);
  }

  const sharing = camOn || locOn;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="text-center animate-fade-up">
        <Link href="/" className="text-accent text-sm">← Home</Link>
        <h1 className="font-display text-3xl font-bold mt-1">📱 <span className="text-gradient">Phone Side</span></h1>
        <p className="text-mist text-sm mt-1">Is phone ki camera + location dashboard par share karo.</p>
      </div>

      {!connected ? (
        <div className="glass rounded-3xl p-5 mt-5 animate-fade-up-1">
          <label className="text-sm text-mist">Room Code (6 letters)</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="e.g. AMMAR1"
            className="w-full mt-2 rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-center text-xl tracking-[0.3em] font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition"
          />
          <div className="flex gap-3 mt-3">
            <button onClick={() => setCode(genCode())} className="flex-1 rounded-2xl bg-white/10 border border-white/15 py-3 font-bold btn-lift">
              🎲 Random
            </button>
            <button
              onClick={requestAll}
              className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 text-[#06202f] py-3 font-bold btn-lift"
            >
              ✅ Sab Permissions Allow Karo
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {Object.keys(PERM_LABELS).map((k) => (
              <div key={k} className="flex justify-between rounded-xl bg-black/25 px-3 py-2 text-sm">
                <span>{PERM_LABELS[k]}</span>
                <b className={perms[k] === "granted" ? "text-green-400" : perms[k] === "denied" ? "text-red-400" : "text-faint"}>
                  {perms[k] === "granted" ? "✅ Granted" : perms[k] === "denied" ? "❌ Denied" : "—"}
                </b>
              </div>
            ))}
            <div className="flex justify-between rounded-xl bg-black/25 px-3 py-2 text-sm">
              <span>📞 Phone Number</span>
              <b className="text-faint">✗ Browser mein nahi milta</b>
            </div>
            <div className="flex justify-between rounded-xl bg-black/25 px-3 py-2 text-sm">
              <span>📇 Contacts / SMS</span>
              <b className="text-faint">✗ Browser mein nahi milte</b>
            </div>
          </div>

          <button
            onClick={connect}
            disabled={connecting}
            className="w-full mt-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 py-3.5 font-bold text-lg disabled:opacity-50 btn-lift"
          >
            {connecting ? "Jud rahe hain..." : "🔗 Connect Karo"}
          </button>
          {error && <div className="mt-3 rounded-xl bg-red-900/50 px-3 py-2 text-sm text-red-200">{error}</div>}
          <p className="text-sm text-mist leading-relaxed mt-3">
            ⚠️ Sharing sirf tab hoti hai jab ye page khula ho aur SHARING ON ho. Page band = sab band.
            Kuch bhi save ya record nahi hota.
          </p>
        </div>
      ) : (
        <>
          <div className={`text-center font-bold rounded-2xl py-2.5 mt-5 animate-fade-up ${dashSeen ? "bg-green-900/60 text-green-300" : "bg-yellow-900/50 text-yellow-200"}`}>
            {status}
          </div>
          {sharing && (
            <div className="flex items-center justify-center gap-2 font-bold rounded-2xl py-3 mt-3 bg-red-900/70 border border-red-500 animate-glow">
              <span className="live-dot inline-block w-3 h-3 rounded-full bg-red-500" />
              🔴 SHARING ON — Camera / Location live ja raha hai
            </div>
          )}

          <div className="glass rounded-3xl p-4 mt-3 text-center animate-fade-up-1">
            <div className="text-sm text-mist">Room Code</div>
            <div className="font-display text-3xl font-bold tracking-[0.3em] text-gradient">{code}</div>
            <div className="text-sm mt-1">Dashboard: {dashSeen ? "✅ Jud gaya!" : "— (abhi koi nahi)"}</div>
          </div>

          <div className="glass rounded-3xl p-4 mt-3 animate-fade-up-2">
            <b>🎛️ Sharing Controls</b>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => (camOn ? stopCam() : startCam())}
                className={`flex-1 rounded-2xl py-3 font-bold btn-lift ${camOn ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-red-500/70"}`}
              >
                📷 Camera: {camOn ? "ON" : "OFF"}
              </button>
              <button
                onClick={() => (locOn ? stopLoc() : startLoc())}
                className={`flex-1 rounded-2xl py-3 font-bold btn-lift ${locOn ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-red-500/70"}`}
              >
                📍 Location: {locOn ? "ON" : "OFF"}
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={flipCamera} className="flex-1 rounded-2xl bg-white/10 border border-white/15 py-3 font-bold btn-lift">
                🔄 Camera Flip
              </button>
              <select
                value={quality}
                onChange={(e) => changeQuality(e.target.value)}
                className="flex-1 rounded-2xl bg-black/40 border border-white/20 py-3 px-2 font-bold text-white"
              >
                {Object.keys(QUALITY).map((k) => (
                  <option key={k} value={k} className="text-black">
                    {QUALITY[k].label}
                  </option>
                ))}
              </select>
            </div>

            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl bg-black mt-3 ring-1 ring-white/20" />

            <div className="mt-3">
              <div className="flex justify-between text-sm">
                <span>🎙️ Mic {micOn ? "ON" : "OFF"}</span>
                <span>{micLevel}%</span>
              </div>
              <div className="h-3 rounded-full bg-black/40 mt-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: micLevel + "%" }} />
              </div>
            </div>

            <div className="text-sm text-mist mt-3">
              Frames: <b className="text-white">{frames}</b> • Location:{" "}
              <b className="text-white">
                {lastLoc ? lastLoc.lat.toFixed(5) + ", " + lastLoc.lng.toFixed(5) + " (±" + lastLoc.acc + "m)" : "—"}
              </b>
            </div>

            <button onClick={stopAll} className="w-full mt-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 py-3 font-bold btn-lift">
              ⛔ Sab Band Karo (Sharing Off)
            </button>
            <button onClick={disconnect} className="w-full mt-2 rounded-2xl bg-white py-3 font-bold text-[#0f2a43] btn-lift">
              🚪 Disconnect
            </button>
          </div>

          <div className="glass rounded-3xl p-4 mt-3 animate-fade-up-3">
            <b>📋 Log</b>
            <div className="text-[13px] leading-6 bg-black/30 rounded-xl p-3 max-h-36 overflow-y-auto mt-2">
              {log.length === 0 ? <div>Sharing shuru hone par yahan updates aayengi...</div> : log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <p className="text-sm text-mist mt-2">
              🔒 Room Code jisko pata hai wo hi dekh sakta hai — random code use karo, kisi se share na karo.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
