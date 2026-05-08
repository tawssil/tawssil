// app/api/payment/mollie/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function mustEnv(name: string) {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type MollieMoney = { currency: string; value: string };

type MolliePayment = {
  id: string; // tr_...
  status: string; // open, paid, failed, canceled, expired, ...
  amountRefunded?: MollieMoney; // refunded amount (if any)
  amountChargedBack?: MollieMoney; // charged back amount (if any)
};

function moneyValue(m?: MollieMoney) {
  const v = Number(String(m?.value ?? "0").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

function mapMollieToPaymentStatus(p: MolliePayment) {
  // Refund/chargeback can exist even when status is "paid"
  if (moneyValue(p.amountChargedBack) > 0) return "charged_back";
  if (moneyValue(p.amountRefunded) > 0) return "refunded";

  const s = String(p.status || "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "open") return "pending";
  if (s === "failed") return "failed";
  if (s === "canceled") return "cancelled";
  if (s === "expired") return "expired";
  return "pending";
}

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json().catch(() => ({}));
    const orderId = Number(order_id);

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid order_id" }, { status: 400 });
    }

    const MOLLIE_API_KEY = mustEnv("MOLLIE_API_KEY");

    // 1) Order ophalen (we hebben payment_reference nodig)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, payment_status, payment_reference, paid_at, refunded_at, charged_back_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) return NextResponse.json({ ok: false, error: orderErr.message }, { status: 500 });
    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    const mollieId = String(order.payment_reference ?? "").trim();
    if (!mollieId || !mollieId.startsWith("tr_")) {
      return NextResponse.json(
        { ok: false, error: "No valid Mollie payment_reference on order" },
        { status: 400 }
      );
    }

    // 2) Mollie payment ophalen (LET OP: payments (meervoud))
    const r = await fetch(`https://api.mollie.com/v2/payments/${mollieId}`, {
      headers: { Authorization: `Bearer ${MOLLIE_API_KEY}` },
    });

    const p = (await r.json().catch(() => null)) as MolliePayment | null;

    if (!r.ok || !p?.id) {
      return NextResponse.json(
        { ok: false, error: (p as any)?.detail ?? "Failed to fetch Mollie payment" },
        { status: 500 }
      );
    }

    // 3) Map naar jouw payment_status
    const payment_status = mapMollieToPaymentStatus(p);

    // 4) Update order (niet paid_at nullen als het al gevuld is)
    const update: Record<string, any> = { payment_status };

    if (payment_status === "paid" && !order.paid_at) {
      update.paid_at = new Date().toISOString();
    }
    if (payment_status === "refunded" && !order.refunded_at) {
      update.refunded_at = new Date().toISOString();
    }
    if (payment_status === "charged_back" && !order.charged_back_at) {
      update.charged_back_at = new Date().toISOString();
    }

    const { error: upErr } = await supabase.from("orders").update(update).eq("id", orderId);
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      payment_status,
      mollie_status: p.status,
      status: order.status ?? null,
      mollie_payment_id: p.id,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}