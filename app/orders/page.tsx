"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Order = {
  id: number;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  total_price: number;
  status: string;
  payment_status: string | null;
};

function statusLabel(status: string) {
  const s = String(status ?? "").toLowerCase();

  if (s === "new") return "Ontvangen";
  if (s === "accepted") return "Geaccepteerd";
  if (s === "preparing") return "Wordt bereid";
  if (s === "ready") return "Klaar";
  if (s === "delivered") return "Bezorgd";
  if (s === "cancelled") return "Geannuleerd";

  return status || "Onbekend";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setErr(null);

      const { data, error } = await supabaseBrowser
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      setOrders((data as Order[]) ?? []);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Terug naar home
        </Link>
      </div>

      <h1 className="text-3xl font-bold">Mijn bestellingen</h1>

      {loading ? (
        <div className="mt-6 text-sm text-zinc-600">Laden…</div>
      ) : null}

      {err ? (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {orders.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-zinc-500">
            Geen bestellingen gevonden.
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Bestelling #{order.id}</div>
                  <div className="text-sm text-zinc-500">
                    {new Date(order.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="text-sm font-medium">
                  {statusLabel(order.status)}
                </div>
              </div>

              <div className="mt-3 text-sm text-zinc-700">
                Totaal: {Number(order.total_price).toFixed(2)} MAD
              </div>

              <div className="mt-4">
                <Link
                  href={`/order/${order.id}`}
                  className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  Bekijk bestelling
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}