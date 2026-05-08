import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const restaurant_id = Number(form.get("restaurant_id"));
    const category_id = Number(form.get("category_id"));
    const name = String(form.get("name") ?? "").trim();
    const descriptionRaw = String(form.get("description") ?? "").trim();
    const price = Number(form.get("price"));

    if (!restaurant_id || !category_id || !name || !Number.isFinite(price)) {
      return NextResponse.json(
        { error: "restaurant_id, category_id, name en price zijn verplicht" },
        { status: 400 }
      );
    }

    const description = descriptionRaw.length ? descriptionRaw : null;

    const { error } = await supabase.from("menu_items").insert([
      {
        category_id,
        name,
        description,
        price,
      },
    ]);

    if (error) throw error;

    // terug naar restaurant beheer pagina
    return NextResponse.redirect(
      new URL(`/admin/restaurants/${restaurant_id}`, req.url)
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create menu item" },
      { status: 500 }
    );
  }
}
