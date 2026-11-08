"use client";
import { useState } from "react";
import Link from "next/link";
import { genCode } from "../lib/remote";

export default function Home() {
  const [code, setCode] = useState("");

  const goCode = code.trim().toUpperCase() || genCode();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 relative">
      <div className="orb orb-cyan" />
      <div className="orb orb-violet" />

      <div className="text-center relative z-10 animate-fade-up">
        <div className="text-5xl animate-float">📱</div>
        <h1 className="font-display text-5xl font-bold mt-3 tracking-tight">
          MyPersonal<span className="text-gradient">Access</span>
        </h1>
        <p className="text-mist mt-3 leading-relaxed max-w-md mx-auto">
          Apne phone ki <b className="text-white">live camera, location, mic aur device info</b> —
          apni website par dekho. Koi teesri app nahi, koi virus ka risk nahi.
          Sirf tumhara apna phone, tumhara apna account.
        </p>
        <div className="flex justify-center gap-2 mt-4">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">🔒 Key Protected</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">⚡ Live Relay</span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">🚫 Nothing Saved</span>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 mt-8 relative z-10 animate-fade-up-1">
        <label className="text-sm text-mist">Room Code (6 letters — yehi tumhara personal lock hai)</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder="e.g. AMMAR1"
          className="w-full mt-2 rounded-2xl border border-white/20 bg-black/40 px-4 py-3.5 text-center text-2xl tracking-[0.35em] font-bold text-white placeholder:text-faint outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 transition"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setCode(genCode())}
            className="flex-1 rounded-2xl bg-white/10 border border-white/15 py-3.5 font-bold btn-lift"
          >
            🎲 Random Code
          </button>
          <Link
            href={`/phone?code=${goCode}`}
            className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 text-[#06202f] py-3.5 font-bold text-center btn-lift"
          >
            📱 Phone — Share Karo
          </Link>
          <Link
            href={`/dashboard?code=${goCode}`}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 text-white py-3.5 font-bold text-center btn-lift"
          >
            🖥️ Dashboard — Dekho
          </Link>
        </div>
        <p className="text-sm text-mist leading-relaxed mt-4">
          📲 <b className="text-white">Kaise use kare:</b> Phone par <b className="text-white">Phone — Share Karo</b> kholo,
          code daalo, <b className="text-white">Sab Permissions Allow Karo</b> dabao. Phir dusri device/PC par{" "}
          <b className="text-white">Dashboard — Dekho</b> kholo, wahi code daalo — live camera + location nazar aayega.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 relative z-10 animate-fade-up-2">
        <div className="glass card-hover rounded-3xl p-5">
          <div className="text-3xl">📷</div>
          <b className="block mt-2">Live Camera</b>
          <p className="text-sm text-mist mt-1">Phone ki camera ki live tasveer, front ya back — dashboard par.</p>
        </div>
        <div className="glass card-hover rounded-3xl p-5">
          <div className="text-3xl">📍</div>
          <b className="block mt-2">Live Location</b>
          <p className="text-sm text-mist mt-1">GPS location, Google Maps link ke saath.</p>
        </div>
        <div className="glass card-hover rounded-3xl p-5">
          <div className="text-3xl">🎙️</div>
          <b className="block mt-2">Mic Level</b>
          <p className="text-sm text-mist mt-1">Microphone permission + live level meter.</p>
        </div>
        <div className="glass card-hover rounded-3xl p-5">
          <div className="text-3xl">🔔</div>
          <b className="block mt-2">Ring + Control</b>
          <p className="text-sm text-mist mt-1">Dashboard se phone bajao, camera/location band karo.</p>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 mt-4 relative z-10 animate-fade-up-3">
        <b>🔒 Sach baatein</b>
        <ul className="text-sm text-mist leading-relaxed mt-2 list-disc pl-5">
          <li>
            Site <b className="text-white">personal key</b> se locked hai — key jisko pata hai wo hi andar aa sakta hai.
            Ye casual logo ko rokta hai; poori server security ke liye login system chahiye hota hai.
          </li>
          <li>
            <b className="text-white">Phone number, contacts, SMS browser se nahi milte</b> — koi bhi website ye nahi
            de sakti. Ye sirf native Android app (APK) se mumkin hai.
          </li>
          <li>Sharing sirf tab hoti hai jab phone par page khula ho aur SHARING ON ho — page band = sab band.</li>
          <li>Kuch bhi save ya record nahi hota — jo dikhta hai wo live hai.</li>
          <li>Room Code jisko pata hai wo hi dekh sakta hai — random code use karo.</li>
        </ul>
      </div>
    </main>
  );
}
