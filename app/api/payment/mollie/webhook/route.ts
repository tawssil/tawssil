import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function mustEnv(name: string) {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // IMPORTANT: service role key nodig om orders te updaten
  { auth: { persistSession: false } }
);

type MolliePayment = {
  id: string; // tr_...
  status: "open" | "paid" | "failed" | "canceled" | "expired" | string;
  metadata?: {
    order_id?: number;
  };
};

function mapMollieStatusToPaymentStatus(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "open") return "pending"; // open = payment nog niet afgerond
  if (s === "failed") return "failed";
  if (s === "canceled") return "cancelled";
  if (s === "expired") return "expired";
  return "pending";
}

/**
 * Mollie webhook stuurt meestal:
 * Content-Type: application/x-www-form-urlencoded
 * body: id=tr_xxxxx
 */
async function extractPaymentId(req: Request): Promise<string> {
  const ct = req.headers.get("content-type") || "";

  // 1) form-urlencoded (meest voorkomend)
  if (ct.includes("application/x-www-form-urlencoded")) {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    return String(params.get("id") ?? "").trim();
  }

  // 2) JSON (soms in tests / eigen calls)
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => null);
    return String(body?.id ?? body?.payment_id ?? "").trim();
  }

  // 3) fallback: probeer text als querystring
  const raw = await req.text().catch(() => "");
  const params = new URLSearchParams(raw);
  return String(params.get("id") ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const MOLLIE_API_KEY = mustEnv("MOLLIE_API_KEY");

    const paymentId = await extractPaymentId(req);
    if (!paymentId || !paymentId.startsWith("tr_")) {
      // Mollie verwacht 200 terug. We geven 200 zodat Mollie niet blijft retryen,
      // maar log in je server logs dat het mis ging.
      console.error("Mollie webhook: missing/invalid payment id:", paymentId);
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    // 1) haal payment op bij Mollie (source of truth)
    const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MOLLIE_API_KEY}` },
    });

    const mollieJson = (await mollieRes.json().catch(() => null)) as MolliePayment | null;

    if (!mollieRes.ok || !mollieJson?.id) {
      console.error("Mollie webhook: failed to fetch payment", paymentId, mollieJson);
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const paymentStatus = mapMollieStatusToPaymentStatus(mollieJson.status);

    // 2) update order via payment_reference (die heb jij opgeslagen als tr_...)
    const update: Record<string, any> = {
      payment_status: paymentStatus,
      payment_reference: mollieJson.id,
      payment_provider: "mollie",
      payment_method: "online",
    };

    if (paymentStatus === "paid") {
      update.paid_at = new Date().toISOString();
    }

    const { data: updated, error: upErr } = await supabase
      .from("orders")
      .update(update)
      .eq("payment_reference", mollieJson.id)
      .select("id")
      .maybeSingle();

    if (upErr) {
      console.error("Mollie webhook: db update error", upErr);
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    // Als er nog geen payment_reference was (edge case), probeer op metadata.order_id
    if (!updated?.id) {
      const metaOrderId = Number(mollieJson.metadata?.order_id);
      if (Number.isFinite(metaOrderId) && metaOrderId > 0) {
        const { error: upErr2 } = await supabase
          .from("orders")
          .update(update)
          .eq("id", metaOrderId);

        if (upErr2) {
          console.error("Mollie webhook: fallback update error", upErr2);
          return NextResponse.json({ ok: false }, { status: 200 });
        }
      }
    }

    // Mollie: altijd snel 200 teruggeven
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("Mollie webhook: server error", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
