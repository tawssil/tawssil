import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function mustEnv(name: string) {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const allowedStatuses = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
    const ANON_KEY = mustEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const SERVICE_ROLE_KEY = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

    // 1) Bearer token lezen
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing bearer token" },
        { status: 401 }
      );
    }

    // 2) Token valideren met anon client
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: userErr?.message ?? "Invalid session" },
        { status: 401 }
      );
    }

    // 3) Body lezen
    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.order_id);
    const status = String(body?.status ?? "").trim().toLowerCase();

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid order_id" },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    // 4) Service role client voor database
    const supabaseSrv = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 5) Zoek gekoppeld restaurant van deze user
    const { data: ru, error: ruErr } = await supabaseSrv
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ruErr) {
      return NextResponse.json(
        { ok: false, error: ruErr.message },
        { status: 500 }
      );
    }

    if (!ru?.restaurant_id) {
      return NextResponse.json(
        { ok: false, error: "No restaurant linked" },
        { status: 403 }
      );
    }

    // 6) Check of order bij dit restaurant hoort
    const { data: order, error: orderErr } = await supabaseSrv
      .from("orders")
      .select("id, restaurant_id, status")
      .eq("id", orderId)
      .eq("restaurant_id", ru.restaurant_id)
      .maybeSingle();

    if (orderErr) {
      return NextResponse.json(
        { ok: false, error: orderErr.message },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found for this restaurant" },
        { status: 404 }
      );
    }

    // 7) Update status
    const { error: updateErr } = await supabaseSrv
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("restaurant_id", ru.restaurant_id);

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      restaurant_id: ru.restaurant_id,
      status,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}