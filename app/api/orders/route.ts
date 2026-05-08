// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type IncomingItem = {
  menu_item_id: number;
  quantity: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const restaurant_id = Number(body?.restaurant_id);
    const customer_name = String(body?.customer_name ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const items = (body?.items ?? []) as IncomingItem[];

    if (!Number.isFinite(restaurant_id) || restaurant_id <= 0) {
      return NextResponse.json({ error: "Invalid restaurant_id" }, { status: 400 });
    }
    if (!customer_name || !phone || !address) {
      return NextResponse.json({ error: "Missing customer info" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    const cleanItems = items
      .map((i) => ({
        menu_item_id: Number(i.menu_item_id),
        quantity: Number(i.quantity),
      }))
      .filter(
        (x) =>
          Number.isFinite(x.menu_item_id) &&
          x.menu_item_id > 0 &&
          Number.isFinite(x.quantity) &&
          x.quantity > 0
      );

    if (cleanItems.length !== items.length) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const menuItemIds = cleanItems.map((i) => i.menu_item_id);

    // 1) menu items ophalen (GEEN restaurant_id kolom in jouw schema)
    const { data: menuRows, error: menuErr } = await supabase
      .from("menu_items")
      .select("id, price, category_id")
      .in("id", menuItemIds);

    if (menuErr) {
      return NextResponse.json({ error: menuErr.message }, { status: 500 });
    }

    if (!menuRows || menuRows.length !== menuItemIds.length) {
      return NextResponse.json({ error: "One or more menu items not found" }, { status: 400 });
    }

    // 2) categories ophalen om restaurant_id te checken
    const categoryIds = Array.from(
      new Set(
        menuRows
          .map((r: any) => Number(r.category_id))
          .filter((x) => Number.isFinite(x) && x > 0)
      )
    );

    const { data: catRows, error: catErr } = await supabase
      .from("categories")
      .select("id, restaurant_id")
      .in("id", categoryIds);

    if (catErr) {
      return NextResponse.json({ error: catErr.message }, { status: 500 });
    }

    const catMap = new Map<number, number>();
    (catRows ?? []).forEach((c: any) => {
      catMap.set(Number(c.id), Number(c.restaurant_id));
    });

    // 3) map menuItemId -> menuRow, en check restaurant match via category
    const menuMap = new Map<number, { price: number; category_id: number }>();
    for (const r of menuRows as any[]) {
      menuMap.set(Number(r.id), {
        price: Number(r.price ?? 0),
        category_id: Number(r.category_id),
      });
    }

    for (const it of cleanItems) {
      const row = menuMap.get(it.menu_item_id);
      if (!row) {
        return NextResponse.json({ error: `Menu item not found: ${it.menu_item_id}` }, { status: 400 });
      }

      const catRestaurantId = catMap.get(row.category_id);
      if (!catRestaurantId) {
        return NextResponse.json(
          { error: `Category not found for menu item ${it.menu_item_id}` },
          { status: 400 }
        );
      }

      if (catRestaurantId !== restaurant_id) {
        return NextResponse.json(
          { error: `Menu item ${it.menu_item_id} is not in this restaurant` },
          { status: 400 }
        );
      }
    }

    // 4) total berekenen
    const total_price = cleanItems.reduce((sum, it) => {
      const row = menuMap.get(it.menu_item_id)!;
      return sum + row.price * it.quantity;
    }, 0);

    // 5) order aanmaken
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id,
        customer_name,
        phone,
        address,
        total_price,
        status: "new",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: orderErr?.message ?? "Failed to create order" }, { status: 500 });
    }

    // 6) order_items aanmaken (price invullen!)
    const rows = cleanItems.map((it) => {
      const row = menuMap.get(it.menu_item_id)!;
      return {
        order_id: order.id,
        menu_item_id: it.menu_item_id,
        quantity: it.quantity,
        price: row.price, // kolom heet "price"
      };
    });

    const { error: itemsErr } = await supabase.from("order_items").insert(rows);

    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order_id: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
