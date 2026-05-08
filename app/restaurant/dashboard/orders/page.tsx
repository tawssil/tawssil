"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  menu_items: {
    id: number;
    name: string;
  } | null;
};

type Order = {
  id: number;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  total_price: number;
  status: string;
  payment_status: string | null;
  restaurant_id: number;
  order_items: OrderItem[];
};

export default function RestaurantOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [lastRealtimeMsg, setLastRealtimeMsg] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  async function load() {
    setErr(null);
    setLoading(true);

    const { data: sessionData } = await supabaseBrowser.auth.getSession();

    if (!sessionData.session) {
      router.push("/restaurant/login");
      return;
    }

    const {
      data: { user },
    } = await supabaseBrowser.auth.getUser();

    if (!user) {
      setErr("Geen gebruiker gevonden");
      setLoading(false);
      return;
    }

    const { data: ru, error: ruErr } = await supabaseBrowser
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ruErr) {
      setErr(ruErr.message);
      setLoading(false);
      return;
    }

    if (!ru?.restaurant_id) {
      setErr("No restaurant linked");
      setOrders([]);
      setLoading(false);
      return;
    }

    const rid = Number(ru.restaurant_id);
    setRestaurantId(rid);

    const { data, error } = await supabaseBrowser
      .from("orders")
      .select(`
        id,
        created_at,
        customer_name,
        phone,
        address,
        total_price,
        status,
        payment_status,
        restaurant_id,
        order_items (
          id,
          quantity,
          price,
          menu_items (
            id,
            name
          )
        )
      `)
      .eq("restaurant_id", rid)
      .order("id", { ascending: false });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  async function setStatus(orderId: number, status: string) {
    setErr(null);
    setUpdatingId(orderId);

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/api/restaurant/orders/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        status,
      }),
    });

    const j = await res.json().catch(() => null);

    if (!res.ok || !j?.ok) {
      setErr(j?.error ?? "Status update mislukt");
      setUpdatingId(null);
      return;
    }

    await load();
    setUpdatingId(null);
  }

  function statusBadge(status: string) {
    const s = status.toLowerCase();

    const base =
      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium border";

    if (s === "new") return `${base} border-blue-200 bg-blue-50 text-blue-700`;
    if (s === "accepted") return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
    if (s === "preparing") return `${base} border-amber-200 bg-amber-50 text-amber-700`;
    if (s === "ready") return `${base} border-purple-200 bg-purple-50 text-purple-700`;
    if (s === "delivered") return `${base} border-zinc-200 bg-zinc-100 text-zinc-700`;
    if (s === "cancelled") return `${base} border-red-200 bg-red-50 text-red-700`;

    return `${base} border-zinc-200 bg-zinc-50 text-zinc-700`;
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    if (channelRef.current) {
      supabaseBrowser.removeChannel(channelRef.current);
    }

    const channel = supabaseBrowser
      .channel(`restaurant-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const eventType = payload.eventType;

          if (eventType === "INSERT") {
            setLastRealtimeMsg("Nieuwe bestelling binnengekomen");

            const audio = new Audio("/sounds/new-order.mp3");
            audio.volume = 0.8;
            audio.play().catch(() => {});
          }

          if (eventType === "UPDATE") {
            setLastRealtimeMsg("Bestelling bijgewerkt");
          }

          await load();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabaseBrowser.removeChannel(channelRef.current);
      }
    };
  }, [restaurantId]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bestellingen</h1>
            <p className="text-sm text-zinc-600">
              Bekijk en beheer binnenkomende bestellingen.
            </p>

            {restaurantId && (
              <p className="text-xs text-zinc-500 mt-1">
                Restaurant ID: {restaurantId}
              </p>
            )}
          </div>

          <button
            onClick={load}
            className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>

        {lastRealtimeMsg && (
          <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
            {lastRealtimeMsg}
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          Laden…
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold text-lg">
                    Bestelling #{o.id}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>

                <div className={statusBadge(o.status)}>{o.status}</div>
              </div>

              <div className="mt-4 text-sm grid gap-2 sm:grid-cols-2">
                <div>Klant: {o.customer_name}</div>
                <div>Telefoon: {o.phone}</div>
                <div className="sm:col-span-2">Adres: {o.address}</div>
                <div>Totaal: {o.total_price} MAD</div>
                <div>Betaling: {o.payment_status}</div>
              </div>

              <div className="mt-4 border rounded-lg bg-zinc-50 p-4">
                <div className="text-sm font-semibold mb-2">Items</div>

                {o.order_items.map((it) => (
                  <div
                    key={it.id}
                    className="flex justify-between text-sm"
                  >
                    <div>{it.menu_items?.name}</div>
                    <div>
                      x{it.quantity} • {it.price} MAD
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setStatus(o.id, "accepted")}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  Accepteren
                </button>

                <button
                  onClick={() => setStatus(o.id, "preparing")}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  Bereiden
                </button>

                <button
                  onClick={() => setStatus(o.id, "ready")}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  Klaar
                </button>

                <button
                  onClick={() => setStatus(o.id, "delivered")}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  Geleverd
                </button>

                <button
                  onClick={() => setStatus(o.id, "cancelled")}
                  className="rounded-md border border-red-200 text-red-700 px-3 py-2 text-sm"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}