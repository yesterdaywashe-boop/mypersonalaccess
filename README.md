# MyPersonalAccess — Apna Phone, Apni Website

Personal remote-access web app: apne phone ki **live camera, location, mic level, battery aur device info** apni website (dashboard) par dekho — koi teesri app nahi, sab tumhare apne Supabase project par.

## Kaise use kare

1. Phone par `/phone` kholo, Room Code daalo (ya Random), **"Sab Permissions Allow Karo"** dabao — camera, mic, location, notifications ek-ek karke Allow karo.
2. Dusri device/PC par `/dashboard` kholo, wahi Room Code daalo.
3. Dashboard par live camera + location + info dikhega. Wahan se **Phone Bajao** (ring), Camera Band, Location Band, Sab Band bhi kar sakte ho.

## APK companion app (complete access)

Website wala phone page browser ki limits mein rehta hai (number/contacts/SMS
nahi milte). **Poora access** chahiye to Android companion app install karo:

- Source: `~/workspace/mypersonalaccess-android/` (zip bhi hai) — Android Studio
  mein APK banao, phone par install karo, permissions Allow karo, Room Code
  daal kar Sharing Start karo.
- App se dashboard par ye extra data aata hai: **phone number** (SIM par save ho
  to), **contacts**, **recent SMS**, **call log**, **recent photos/videos** —
  dashboard par "Phone Data — APK App se" panel mein dikhta hai.
- Extra commands: **Refresh Phone Data** aur **Photo Now**.

## Sach baatein (honest limits)

- **Phone number, contacts, SMS, call logs browser se nahi milte** — koi bhi website ye nahi de sakti. Ye cheezein sirf native Android app se mil sakti hain (permissions ke saath).
- Sharing sirf tab hoti hai jab phone par page khula ho aur SHARING ON ho — page band = sab band.
- Kuch bhi save/record nahi hota — frames aur location sirf live broadcast hote hain, memory mein rehte hain.
- Room Code hi lock hai — random code use karo, kisi se share na karo.

## Tech

- Next.js 14 (App Router) + React 18 + Tailwind
- Relay: Supabase Realtime broadcast (apna GamesHub project) — channel `remote-<CODE>`, event `remote`
- Dono taraf internet ON hona chahiye. Camera/location ke liye HTTPS zaroori hai (Vercel HTTPS deta hai).
- Zero runtime CDN — fonts build-time par aate hain.
