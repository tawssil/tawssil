import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function mustEnv(name: string) {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
    const ANON_KEY = mustEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    // 1) Lees bearer token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing Bearer token" }, { status: 401 });
    }

    // 2) Validate token met ANON client (dit is de juiste manier)
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);

    if (userErr || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: userErr?.message ?? "Invalid session" },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // 3) Body lezen
    const body = await req.json().catch(() => ({}));
    const restaurantId = Number(body?.restaurant_id);

    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid restaurant_id" }, { status: 400 });
    }

    // 4) Service role client voor DB writes (bypasst RLS)
    const supabaseSrv = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Bestaat restaurant?
    const { data: rest, error: restErr } = await supabaseSrv
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restErr) {
      return NextResponse.json({ ok: false, error: restErr.message }, { status: 500 });
    }
    if (!rest?.id) {
      return NextResponse.json({ ok: false, error: "Restaurant not found" }, { status: 404 });
    }

    // 5) Zorg dat user maar 1 koppeling heeft: delete old, insert new
    const { error: delErr } = await supabaseSrv
      .from("restaurant_users")
      .delete()
      .eq("user_id", userId);

    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
    }

    const { error: insErr } = await supabaseSrv.from("restaurant_users").insert({
      user_id: userId,
      restaurant_id: restaurantId,
    });

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user_id: userId, restaurant_id: restaurantId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}