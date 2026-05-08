"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Order = {
  id: number;
  customer_name: string;
  phone: string | null;
  address: string | null;
  total_price: number;
  payment_method: string | null;
  payment_status: string | null;
  status: string;
  created_at: string;
  restaurant_id: number | null;
  driver_id: number | null;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function loadOrders() {
    setErr(null);

    const { data, error } = await supabaseBrowser
      .from("orders")
      .select(`
        id,
        customer_name,
        phone,
        address,
        total_price,
        payment_method,
        payment_status,
        status,
        created_at,
        restaurant_id,
        driver_id
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();

    const channel = supabaseBrowser
      .channel("admin-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  function statusColor(status: string) {
    const s = String(status ?? "").toLowerCase();

    if (s === "new") return "bg-blue-100 text-blue-700";
    if (s === "accepted") return "bg-yellow-100 text-yellow-700";
    if (s === "preparing") return "bg-orange-100 text-orange-700";
    if (s === "ready") return "bg-purple-100 text-purple-700";
    if (s === "assigned") return "bg-indigo-100 text-indigo-700";
    if (s === "picked_up") return "bg-cyan-100 text-cyan-700";
    if (s === "delivered") return "bg-emerald-100 text-emerald-700";
    if (s === "cancelled") return "bg-red-100 text-red-700";

    return "bg-zinc-100 text-zinc-700";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">

      <div>
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-zinc-500 hover:text-black"
        >
          ← Terug naar admin
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Order beheer
        </h1>

        <p className="mt-2 text-sm text-zinc-600">
          Bekijk alle bestellingen op het platform.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
          Laden...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
          Geen bestellingen gevonden.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-4 py-4 text-left font-semibold">Order</th>
                <th className="px-4 py-4 text-left font-semibold">Klant</th>
                <th className="px-4 py-4 text-left font-semibold">Bedrag</th>
                <th className="px-4 py-4 text-left font-semibold">Betaling</th>
                <th className="px-4 py-4 text-left font-semibold">Status</th>
                <th className="px-4 py-4 text-left font-semibold">Restaurant</th>
                <th className="px-4 py-4 text-left font-semibold">Driver</th>
                <th className="px-4 py-4 text-left font-semibold">Datum</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr
  key={order.id}
  onClick={() => {
    window.location.href = `/admin/orders/${order.id}`;
  }}
  className="cursor-pointer border-b transition hover:bg-zinc-50 last:border-0"
>
                  <td className="px-4 py-4 font-semibold">
                    #{order.id}
                  </td>

                  <td className="px-4 py-4">
                    <div>{order.customer_name}</div>

                    <div className="mt-1 text-xs text-zinc-500">
                      {order.phone}
                    </div>

                    <div className="mt-1 text-xs text-zinc-400">
                      {order.address}
                    </div>
                  </td>

                  <td className="px-4 py-4 font-medium">
                    {Number(order.total_price).toFixed(2)} MAD
                  </td>

                  <td className="px-4 py-4">
                    <div>{order.payment_method ?? "-"}</div>

                    <div className="mt-1 text-xs text-zinc-500">
                      {order.payment_status ?? "-"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {order.restaurant_id ?? "-"}
                  </td>

                  <td className="px-4 py-4">
                    {order.driver_id ?? "-"}
                  </td>

                  <td className="px-4 py-4 text-xs text-zinc-500">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}