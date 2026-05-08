"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function createRealtimeClient(): SupabaseClient {
  if (supabase) return supabase;

  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries: number) =>
          Math.min(tries * 1000, 10000),
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return supabase;
}
