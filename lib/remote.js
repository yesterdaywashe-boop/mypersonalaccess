import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

let sb = null;

export function getClient() {
  if (!sb) sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}

export function newId() {
  return Math.random().toString(36).slice(2, 9);
}

export function genCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += letters[Math.floor(Math.random() * letters.length)];
  return c;
}

// Room channel name for a code, e.g. remote-AMMAR1
export function channelName(code) {
  return "remote-" + String(code || "").toUpperCase();
}
