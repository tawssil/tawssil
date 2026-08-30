import { NextResponse } from "next/server";
import { supabaseServerAuth } from "@/lib/supabaseServerAuth";

async function isAdmin(
  supabase: Awaited<ReturnType<typeof supabaseServerAuth>>
) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (userErr || !user) return false;

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) return false;

  return !!data;
}

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

const ALLOWED = new Set([
  "new",
  "preparing",
  "delivered",
  "cancelled",
]);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id?: string }> }
) {
  try {
    const supabase = await supabaseServerAuth();

    const ok = await isAdmin(supabase);

    if (!ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await ctx.params;

    const idStr = String(params?.id ?? "").trim();
    const orderId = Number(idStr);

    if (!idStr || !Number.isFinite(orderId) || orderId <= 0) {
      return badRequest("Invalid order id");
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, restaurant_id, customer_name, phone, address, total_price, status, created_at"
      )
      .eq("id", orderId)
      .limit(1)
      .maybeSingle();

    if (orderErr) {
      return NextResponse.json(
        { error: orderErr.message },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const { data: restaurant, error: restErr } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", order.restaurant_id)
      .limit(1)
      .maybeSingle();

    if (restErr) {
      return NextResponse.json(
        { error: restErr.message },
        { status: 500 }
      );
    }

    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select(
        "id, quantity, price, menu_item_id, menu_items(name, description, price)"
      )
      .eq("order_id", order.id)
      .order("id", { ascending: true });

    if (itemsErr) {
      return NextResponse.json(
        { error: itemsErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order,
      restaurant: restaurant ?? {
        id: order.restaurant_id,
        name: null,
      },
      items: items ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id?: string }> }
) {
  try {
    const supabase = await supabaseServerAuth();

    const ok = await isAdmin(supabase);

    if (!ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await ctx.params;

    const idStr = String(params?.id ?? "").trim();
    const orderId = Number(idStr);

    if (!idStr || !Number.isFinite(orderId) || orderId <= 0) {
      return badRequest("Invalid order id");
    }

    const body = await req.json().catch(() => null);
    const status = String(body?.status ?? "").trim();

    if (!ALLOWED.has(status)) {
      return badRequest("Invalid status");
    }

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}