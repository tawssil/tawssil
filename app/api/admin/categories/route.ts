import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.formData();

    const restaurant_id = Number(body.get("restaurant_id"));
    const name = String(body.get("name") ?? "").trim();

    if (!restaurant_id || !name) {
      return NextResponse.json(
        { error: "restaurant_id en naam zijn verplicht" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("categories")
      .insert([
        {
          restaurant_id,
          name,
        },
      ]);

    if (error) throw error;

    // Redirect terug naar restaurant detail
    return NextResponse.redirect(
      new URL(`/admin/restaurants/${restaurant_id}`, req.url)
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
