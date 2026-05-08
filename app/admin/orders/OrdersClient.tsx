"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type AdminOrder = {
  id: number;
  restaurant_id: number;
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  total_price: number | null;
  status: string | null;
  created_at: string;
  restaurants?: { id: number; name: string | null } | null;
};

function statusStyles(status: string | null | undefined) {
  const s = (status ?? "new").toLowerCase();

  switch (s) {
    case "new":
      return {
        badge: "border-blue-500/40 bg-blue-500/10 text-blue-200",
        dot: "bg-blue-400",
        label: "new",
      };
    case "preparing":
      return {
        badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
        dot: "bg-yellow-400",
        label: "preparing",
      };
    case "delivered":
      return {
        badge: "border-green-500/40 bg-green-500/10 text-green-200",
        dot: "bg-green-400",
        label: "delivered",
      };
    case "cancelled":
      return {
        badge: "border-red-500/40 bg-red-500/10 text-red-200",
        dot: "bg-red-400",
        label: "cancelled",
      };
    default:
      return {
        badge: "border-white/20 bg-white/5 text-white/80",
        dot: "bg-white/60",
        label: s,
      };
  }
}

export default function OrdersClient() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // AbortController om “signal is aborted” te voorkomen bij snelle refresh/navigatie
  const abortRef = useRef<AbortController | null>(null);

  const fetchOrders = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setErr(null);
      setLoading(true);

      const res = await fetch("/api/admin/orders", {
        cache: "no-store",
        signal: ac.signal,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(data?.error ?? "Failed to load orders");
        setOrders([]);
        return;
      }

      setOrders(Array.isArray(data?.orders) ? (data.orders as AdminOrder[]) : []);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setErr(e?.message ?? "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    return () => abortRef.current?.abort();
  }, [fetchOrders]);

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Orders</h1>

        <button
          onClick={fetchOrders}
          className="rounded border px-3 py-2 text-sm hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded border p-4 text-sm opacity-80">Laden…</div>
        ) : orders.length === 0 ? (
          <div className="rounded border p-4 text-sm opacity-80">Geen orders gevonden.</div>
        ) : (
          orders.map((o) => {
            const st = statusStyles(o.status);

            return (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="block rounded border p-4 hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">Order #{o.id}</div>

                    <div className="mt-1 text-sm opacity-80">
                      Restaurant:{" "}
                      <span className="opacity-100">{o.restaurants?.name ?? "—"}</span>
                    </div>

                    <div className="mt-1 text-sm opacity-80">
                      Klant:{" "}
                      <span className="opacity-100">{o.customer_name ?? "—"}</span>
                      {o.phone ? <span className="opacity-80"> • {o.phone}</span> : null}
                    </div>

                    <div className="mt-1 text-sm opacity-80">
                      Totaal:{" "}
                      <span className="opacity-100">
                        {(o.total_price ?? 0).toFixed(2)} MAD
                      </span>
                    </div>

                    <div className="mt-2 text-xs opacity-60">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-sm">
                    <span
                      className={`inline-flex items-center gap-2 rounded border px-2 py-1 ${st.badge}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
