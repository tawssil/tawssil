import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id?: string }> }
) {
  const params = await ctx.params;

  const id = Number(String(params?.id ?? "").trim());

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid id" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, payment_status, payment_provider, status, total_price, created_at"
    )
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}