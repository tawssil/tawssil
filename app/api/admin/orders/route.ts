import { NextResponse } from "next/server";
import { supabaseServerAuth } from "@/lib/supabaseServerAuth";

async function isAdmin(supabase: Awaited<ReturnType<typeof supabaseServerAuth>>) {
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

export async function GET() {
  try {
    const supabase = await supabaseServerAuth();

    const ok = await isAdmin(supabase);
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        "id, restaurant_id, customer_name, phone, address, total_price, status, created_at, restaurants(id, name)"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ orders: orders ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
