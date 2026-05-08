import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

function mustEnv(name: string) {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getMadPerEur() {
  const raw = (process.env.MAD_PER_EUR ?? "10.8").trim();
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 10.8;
}

function toEurValueFromMad(mad: number, madPerEur: number) {
  const eur = mad / madPerEur;
  const rounded = Math.max(0.01, Math.round(eur * 100) / 100);
  return rounded.toFixed(2);
}

function getAppUrl(req: Request) {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  const firstToken = raw.split(/\s+/)[0]?.trim();
  const origin = new URL(req.url).origin;
  const base = firstToken || origin;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.order_id);

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order_id" }, { status: 400 });
    }

    const MOLLIE_API_KEY = mustEnv("MOLLIE_API_KEY");
    const APP_URL = getAppUrl(req);
    const madPerEur = getMadPerEur();

    // 1) Order ophalen
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, total_price, payment_status, payment_reference")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const totalMad = Number(order.total_price ?? 0);

    if (!Number.isFinite(totalMad) || totalMad <= 0) {
      return NextResponse.json({ error: "Invalid total_price" }, { status: 400 });
    }

    const currentPaymentStatus = String(order.payment_status ?? "").toLowerCase();
    if (currentPaymentStatus === "paid") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    // 2) Omrekenen MAD -> EUR
    const eurValue = toEurValueFromMad(totalMad, madPerEur);

    const webhookUrl = `${APP_URL}/api/payment/mollie/webhook`;
    const redirectUrl = `${APP_URL}/return?order_id=${orderId}`;

    // 3) Mollie payment aanmaken
    const createRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLLIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: eurValue,
        },
        description: `Tawssil order #${orderId} (${totalMad.toFixed(2)} MAD)`,
        redirectUrl,
        webhookUrl,
        metadata: {
          order_id: orderId,
          total_mad: totalMad,
          mad_per_eur: madPerEur,
          eur_value: eurValue,
        },
      }),
    });

    const createJson = await createRes.json().catch(() => null);

    if (!createRes.ok) {
      return NextResponse.json(
        {
          error: createJson?.detail ?? "Failed to create Mollie payment",
          mollie: createJson ?? null,
          webhookUrl,
          redirectUrl,
        },
        { status: 500 }
      );
    }

    const molliePaymentId = String(createJson?.id ?? "").trim();
    const checkoutUrl = String(createJson?._links?.checkout?.href ?? "").trim();

    if (!molliePaymentId) {
      return NextResponse.json(
        { error: "Mollie response missing payment id", mollie: createJson ?? null },
        { status: 500 }
      );
    }

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Mollie response missing checkout url", mollie: createJson ?? null },
        { status: 500 }
      );
    }

    // 4) Payment reference opslaan op order
    const { data: updatedOrder, error: upErr } = await supabase
      .from("orders")
      .update({
        payment_provider: "mollie",
        payment_method: "online",
        payment_status: "pending",
        payment_reference: molliePaymentId,
        paid_at: null,
      })
      .eq("id", orderId)
      .select("id, payment_reference")
      .maybeSingle();

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    if (!updatedOrder?.payment_reference) {
      return NextResponse.json(
        { error: "Failed to save payment_reference on order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      mollie_payment_id: molliePaymentId,
      checkout_url: checkoutUrl,
      currency: "EUR",
      eur_value: eurValue,
      total_mad: totalMad,
      mad_per_eur: madPerEur,
      webhookUrl,
      redirectUrl,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
