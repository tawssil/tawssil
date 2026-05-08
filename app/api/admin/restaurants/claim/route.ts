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
    const SERVICE_ROLE = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // user_id uit Authorization header (Supabase access token)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing bearer token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const restaurantId = Number(body?.restaurant_id);

    if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid restaurant_id" }, { status: 400 });
    }

    // Bestaat restaurant?
    const { data: rest, error: rErr } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .maybeSingle();

    if (rErr) return NextResponse.json({ ok: false, error: rErr.message }, { status: 500 });
    if (!rest?.id) return NextResponse.json({ ok: false, error: "Restaurant not found" }, { status: 404 });

    // Bestaat koppeling al?
    const { data: existing, error: exErr } = await supabase
      .from("restaurant_users")
      .select("user_id, restaurant_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });

    if (existing?.restaurant_id) {
      return NextResponse.json({
        ok: true,
        restaurant_id: existing.restaurant_id,
        already: true,
      });
    }

    // Insert koppeling
    const { error: insErr } = await supabase.from("restaurant_users").insert({
      user_id: userId,
      restaurant_id: restaurantId,
    });

    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, restaurant_id: restaurantId, already: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}