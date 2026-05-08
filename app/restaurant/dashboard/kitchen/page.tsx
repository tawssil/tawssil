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

const ACTIVE_STATUSES = ["new", "accepted", "preparing", "ready"];

export default function RestaurantKitchenPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
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
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setOrders((data as unknown as Order[]) ?? []);
    setLoading(false);
  }

  async function setStatus(orderId: number, status: string) {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/api/restaurant/orders/update-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ order_id: orderId, status }),
    });

    const j = await res.json().catch(() => null);

    if (!res.ok || !j?.ok) {
      setErr(j?.error ?? "Status update mislukt");
      return;
    }

    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    if (channelRef.current) {
      supabaseBrowser.removeChannel(channelRef.current);
    }

    const channel = supabaseBrowser
      .channel(`restaurant-kitchen-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            setLastRealtimeMsg("Nieuwe bestelling binnengekomen");

            const audio = new Audio("/sounds/new-order.mp3");
            audio.volume = 0.8;
            audio.play().catch(() => {});
          }

          if (payload.eventType === "UPDATE") {
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

  function nextActions(order: Order) {
    switch (order.status) {
      case "new":
        return (
          <>
            <button
              onClick={() => setStatus(order.id, "accepted")}
              className="rounded-lg bg-black px-4 py-3 text-white"
            >
              Accepteren
            </button>
            <button
              onClick={() => setStatus(order.id, "cancelled")}
              className="rounded-lg border border-red-200 px-4 py-3 text-red-700"
            >
              Annuleren
            </button>
          </>
        );
      case "accepted":
        return (
          <button
            onClick={() => setStatus(order.id, "preparing")}
            className="rounded-lg bg-black px-4 py-3 text-white"
          >
            Start bereiden
          </button>
        );
      case "preparing":
        return (
          <button
            onClick={() => setStatus(order.id, "ready")}
            className="rounded-lg bg-black px-4 py-3 text-white"
          >
            Markeer als klaar
          </button>
        );
      case "ready":
        return (
          <button
            onClick={() => setStatus(order.id, "delivered")}
            className="rounded-lg bg-black px-4 py-3 text-white"
          >
            Markeer als geleverd
          </button>
        );
      default:
        return null;
    }
  }

  function badge(status: string) {
    const map: Record<string, string> = {
      new: "bg-blue-50 text-blue-700 border-blue-200",
      accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
      preparing: "bg-amber-50 text-amber-700 border-amber-200",
      ready: "bg-purple-50 text-purple-700 border-purple-200",
    };

    return `inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
      map[status] ?? "bg-zinc-50 text-zinc-700 border-zinc-200"
    }`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kitchen Mode</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Actieve bestellingen voor snelle verwerking.
            </p>
          </div>

          <button
            onClick={load}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>

        {lastRealtimeMsg ? (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {lastRealtimeMsg}
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          Laden…
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm text-zinc-600">
          Geen actieve bestellingen.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-bold">#{order.id}</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className={badge(order.status)}>{order.status}</div>
              </div>

              <div className="mt-4 space-y-1 text-sm">
                <div><span className="text-zinc-500">Klant:</span> {order.customer_name}</div>
                <div><span className="text-zinc-500">Telefoon:</span> {order.phone}</div>
                <div><span className="text-zinc-500">Adres:</span> {order.address}</div>
                <div><span className="text-zinc-500">Totaal:</span> {Number(order.total_price).toFixed(2)} MAD</div>
                <div><span className="text-zinc-500">Betaling:</span> {order.payment_status ?? "—"}</div>
              </div>

              <div className="mt-4 rounded-xl bg-zinc-50 p-4">
                <div className="mb-2 text-sm font-semibold">Items</div>
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>{item.menu_items?.name ?? "Onbekend product"}</div>
                      <div>x{item.quantity}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {nextActions(order)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}