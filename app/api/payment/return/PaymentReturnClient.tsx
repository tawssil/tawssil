"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type StatusRes = {
  ok: boolean;
  order_id: number;
  payment_status: string; // pending | paid | failed | cancelled | ...
  mollie_status?: string | null;
  checkout_url?: string | null;
  message?: string;
  error?: string;
};

function badgeClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "border-green-500/40 bg-green-500/10 text-green-200";
  if (s === "pending") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
  if (s === "failed" || s === "expired") return "border-red-500/40 bg-red-500/10 text-red-200";
  if (s === "cancelled" || s === "canceled") return "border-red-500/40 bg-red-500/10 text-red-200";
  return "border-white/20 bg-white/5 text-white";
}

export default function PaymentReturnClient({ orderId }: { orderId: string }) {
  const idNum = useMemo(() => {
    const n = Number(orderId);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [orderId]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<StatusRes | null>(null);

  const triesRef = useRef(0);
  const stopRef = useRef(false);

  async function fetchStatus() {
    if (!Number.isFinite(idNum)) {
      setLoading(false);
      setErr("Invalid order id");
      return;
    }

    try {
      setErr(null);

      const r = await fetch(`/api/payments/mollie/status?order_id=${idNum}`, {
        cache: "no-store",
      });
      const j = (await r.json().catch(() => null)) as StatusRes | null;

      if (!r.ok) {
        setErr(j?.error ?? "Failed to fetch payment status");
        setRes(null);
        setLoading(false);
        return;
      }

      setRes(j);
      setLoading(false);

      const ps = String(j?.payment_status ?? "").toLowerCase();
      if (ps === "paid" || ps === "failed" || ps === "expired" || ps === "cancelled" || ps === "canceled") {
        stopRef.current = true; // stop polling
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to fetch payment status");
      setLoading(false);
    }
  }

  useEffect(() => {
    stopRef.current = false;
    triesRef.current = 0;

    // direct check
    fetchStatus();

    // poll max ~30s (15 tries * 2s)
    const t = window.setInterval(() => {
      if (stopRef.current) return;
      triesRef.current += 1;
      if (triesRef.current > 15) {
        stopRef.current = true;
        return;
      }
      fetchStatus();
    }, 2000);

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idNum]);

  if (loading) {
    return (
      <div className="rounded border p-4 text-sm opacity-80">
        Bezig met controleren…
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-3">
        <div className="rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchStatus}
            className="rounded border px-3 py-2 text-sm hover:bg-white/5"
          >
            Opnieuw proberen
          </button>
          <Link
            href="/checkout"
            className="rounded border px-3 py-2 text-sm hover:bg-white/5"
          >
            Terug naar checkout
          </Link>
        </div>
      </div>
    );
  }

  const paymentStatus = String(res?.payment_status ?? "unknown");
  const mollieStatus = String(res?.mollie_status ?? "");
  const checkoutUrl = res?.checkout_url ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded border p-5">
        <div className="text-lg font-semibold">Order #{res?.order_id}</div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm opacity-80">Payment status:</span>
          <span className={`rounded border px-2 py-1 text-sm ${badgeClass(paymentStatus)}`}>
            {paymentStatus}
          </span>
        </div>

        {mollieStatus ? (
          <div className="mt-2 text-sm opacity-70">Mollie: {mollieStatus}</div>
        ) : null}

        {paymentStatus.toLowerCase() === "paid" ? (
          <div className="mt-4 rounded border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">
            Betaling gelukt ✅ Bedankt! Je bestelling is bevestigd.
          </div>
        ) : paymentStatus.toLowerCase() === "pending" ? (
          <div className="mt-4 rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Betaling is nog bezig… Deze pagina ververst automatisch.
          </div>
        ) : (
          <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            Betaling is niet voltooid.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={fetchStatus}
          className="rounded border px-3 py-2 text-sm hover:bg-white/5"
        >
          Refresh status
        </button>

        <Link
          href="/"
          className="rounded border px-3 py-2 text-sm hover:bg-white/5"
        >
          Home
        </Link>

        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            className="rounded border px-3 py-2 text-sm hover:bg-white/5"
          >
            Opnieuw naar Mollie
          </a>
        ) : null}
      </div>
    </div>
  );
}
