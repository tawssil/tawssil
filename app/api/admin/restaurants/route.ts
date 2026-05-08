import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, city_id, address, phone, delivery_fee, is_active")
      .order("id", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const city_id = Number(body?.city_id);
    const address = String(body?.address ?? "").trim();
    const phone = String(body?.phone ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!Number.isFinite(city_id) || city_id <= 0) {
      return NextResponse.json({ error: "Valid city_id is required" }, { status: 400 });
    }

    // defaults
    const delivery_fee = 10; // later per restaurant aanpassen
    const is_active = true;

    const { data, error } = await supabase
      .from("restaurants")
      .insert([
        {
          name,
          city_id,
          address: address || null,
          phone: phone || null,
          delivery_fee,
          is_active,
        },
      ])
      .select("id, name, city_id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, restaurant: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
