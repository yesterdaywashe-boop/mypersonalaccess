"use client";
import { useEffect, useState } from "react";
import { ACCESS_KEY } from "../lib/config";

const STORAGE_KEY = "mpa-access-key";

/**
 * Site access gate: the whole app sits behind Ammar's personal key.
 * Enter the key once per device — it is remembered in localStorage until
 * the floating lock button is tapped.
 *
 * Honest note: this is a client-side deterrent. It stops casual visitors
 * and random links, but the key ships inside the site's own JavaScript, so
 * a determined person could find it. True security would need server-side
 * auth (e.g. Supabase Auth) — the room code stays the second layer.
 */
export default function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === ACCESS_KEY) setUnlocked(true);
    } catch (e) {}
    const onLock = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      setUnlocked(false);
      setInput("");
      setError("");
    };
    window.addEventListener("mpa:lock", onLock);
    return () => window.removeEventListener("mpa:lock", onLock);
  }, []);

  function unlock(e) {
    if (e) e.preventDefault();
    if (input === ACCESS_KEY) {
      try {
        localStorage.setItem(STORAGE_KEY, ACCESS_KEY);
      } catch (e) {}
      setUnlocked(true);
      setError("");
    } else {
      setError("Ghalat key — dobara try karo.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="orb orb-cyan" />
        <div className="orb orb-violet" />
        <div className={`relative z-10 w-full max-w-sm text-center ${shake ? "animate-shake" : ""}`}>
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(56,189,248,0.5)]">
            🔒
          </div>
          <h1 className="font-display text-3xl font-bold mt-5">
            MyPersonal<span className="text-gradient">Access</span>
          </h1>
          <p className="text-mist mt-2 text-sm leading-relaxed">
            Private access — andar aane ke liye apni key daalo.
            <br />
            Key jisko pata hai, sirf wo hi khol sakta hai.
          </p>
          <form onSubmit={unlock} className="glass rounded-2xl p-5 mt-6">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Apni key likho…"
              autoFocus
              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 placeholder:text-faint"
            />
            <button
              type="submit"
              className="w-full mt-3 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 py-3 font-bold text-lg text-[#06202f] hover:opacity-90 active:scale-[0.98] transition"
            >
              🔓 Unlock Karo
            </button>
            {error && (
              <div className="mt-3 rounded-xl bg-red-900/60 px-3 py-2 text-sm text-red-200">{error}</div>
            )}
          </form>
          <p className="text-faint text-xs mt-4">
            🔐 Key bhool gaye? Apne assistant (Muse) se pooch lo — key app ki settings mein hai.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {children}
      <button
        onClick={() => window.dispatchEvent(new Event("mpa:lock"))}
        title="Lock karo"
        className="fixed bottom-4 right-4 z-50 w-11 h-11 rounded-full glass flex items-center justify-center text-lg shadow-lg hover:scale-110 active:scale-95 transition"
      >
        🔒
      </button>
    </>
  );
}
