"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type StatusResp =
  | { ok: true; order_id: number; payment_status: string; status?: string }
  | { ok: false; error: string };

export default function ReturnPage() {
  const sp = useSearchParams();
  const orderId = useMemo(() => Number(sp.get("order_id")), [sp]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("Betaling controleren…");
  const [resp, setResp] = useState<StatusResp | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!Number.isFinite(orderId) || orderId <= 0) {
        setMsg("Ongeldig order_id.");
        setLoading(false);
        return;
      }

      try {
        const r = await fetch("/api/payment/mollie/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId }),
        });

        const j = (await r.json().catch(() => null)) as StatusResp | null;

        if (cancelled) return;

        if (!r.ok || !j) {
          setResp({ ok: false, error: (j as any)?.error ?? "Status check failed" });
          setMsg("Kon betaling niet controleren.");
          setLoading(false);
          return;
        }

        setResp(j);

        if (j.ok) {
          const ps = String(j.payment_status ?? "").toLowerCase();
          if (ps === "paid") setMsg("✅ Betaling gelukt! Dankjewel.");
          else if (ps === "failed") setMsg("❌ Betaling mislukt.");
          else if (ps === "canceled" || ps === "cancelled") setMsg("⚠️ Betaling geannuleerd.");
          else setMsg("⏳ Betaling staat nog op pending. Check later opnieuw.");
        } else {
          setMsg(j.error);
        }
      } catch (e: any) {
        if (cancelled) return;
        setMsg(e?.message ?? "Onbekende fout");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <h1 className="text-3xl font-bold">Betaling</h1>

      <div className="mt-4 rounded border p-4">
        <div className="text-lg font-semibold">{msg}</div>
        <div className="mt-2 text-sm opacity-80">
          Order ID: <span className="opacity-100">{Number.isFinite(orderId) ? orderId : "—"}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link href="/" className="rounded border px-3 py-2 text-sm hover:bg-white/5">
          Terug naar home
        </Link>

        {Number.isFinite(orderId) && orderId > 0 ? (
          <Link
            href={`/order-success?id=${orderId}`}
            className="rounded border px-3 py-2 text-sm hover:bg-white/5"
          >
            Bekijk bestelling
          </Link>
        ) : null}
      </div>

      {!loading && resp && !resp.ok ? (
        <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {resp.error}
        </div>
      ) : null}
    </div>
  );
}
