import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const key = String(body?.key ?? "");

    const adminKey = process.env.ADMIN_KEY;

    if (!adminKey) {
      return NextResponse.json(
        { error: "ADMIN_KEY ontbreekt in .env.local" },
        { status: 500 }
      );
    }

    if (key !== adminKey) {
      return NextResponse.json({ error: "Verkeerde key" }, { status: 401 });
    }

    // Simpel MVP: we geven alleen "ok" terug
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
