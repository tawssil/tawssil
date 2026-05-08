"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

type Driver = {
  id: number;
  name: string;
} | null;

type Order = {
  id: number;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  total_price: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  driver_id: number | null;
  drivers: Driver;
  order_items: OrderItem[];
};

function statusLabel(status: string) {
  const s = String(status ?? "").toLowerCase();

  if (s === "new") return "Ontvangen";
  if (s === "accepted") return "Geaccepteerd";
  if (s === "preparing") return "Wordt bereid";
  if (s === "ready") return "Klaar voor bezorging";
  if (s === "assigned") return "Bezorger toegewezen";
  if (s === "picked_up") return "Onderweg";
  if (s === "delivered") return "Bezorgd";
  if (s === "cancelled") return "Geannuleerd";

  return status;
}

function getStep(status: string) {
  const s = String(status ?? "").toLowerCase();

  if (s === "new") return 1;
  if (s === "accepted") return 2;
  if (s === "preparing") return 3;
  if (s === "ready") return 4;
  if (s === "assigned") return 5;
  if (s === "picked_up") return 6;
  if (s === "delivered") return 7;

  return 1;
}

function statusBadge(status: string) {
  const s = String(status ?? "").toLowerCase();

  const styles: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    accepted: "bg-yellow-100 text-yellow-700",
    preparing: "bg-orange-100 text-orange-700",
    ready: "bg-purple-100 text-purple-700",
    assigned: "bg-indigo-100 text-indigo-700",
    picked_up: "bg-cyan-100 text-cyan-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        styles[s] || "bg-zinc-100 text-zinc-700"
      }`}
    >
      {statusLabel(status)}
    </div>
  );
}

function paymentMethodLabel(paymentMethod: string | null) {
  const pm = String(paymentMethod ?? "").toLowerCase();

  if (pm === "cash") return "Contant bij levering";
  if (pm === "online") return "Online";

  return paymentMethod ?? "—";
}

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  async function loadOrder(id: number) {
    setErr(null);

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
        payment_method,
        driver_id,
        drivers (
          id,
          name
        ),
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
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      setOrder(null);
      return;
    }

    if (!data) {
      setErr("Bestelling niet gevonden.");
      setOrder(null);
      return;
    }

    setOrder(data as unknown as Order);
  }

  useEffect(() => {
    (async () => {
      const resolved = await params;
      const id = Number(resolved.id);

      if (!Number.isFinite(id) || id <= 0) {
        setErr("Ongeldig ordernummer.");
        setLoading(false);
        return;
      }

      setOrderId(id);
      await loadOrder(id);
      setLoading(false);
    })();
  }, [params]);

  useEffect(() => {
    if (!orderId) return;

    if (channelRef.current) {
      supabaseBrowser.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabaseBrowser
      .channel(`customer-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        async () => {
          setMsg("Bestelling bijgewerkt");
          await loadOrder(orderId);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabaseBrowser.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-8 text-sm text-zinc-600 shadow-sm">
          Laden...
        </div>
      </div>
    );
  }

  if (err || !order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
          {err ?? "Bestelling niet gevonden."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Terug naar home
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bestelling #{order.id}
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Geplaatst op {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          {statusBadge(order.status)}
        </div>

        {msg ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {msg}
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border bg-zinc-50 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Bestelling volgen</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Live status van jouw bestelling.
              </p>
            </div>

            {order.drivers?.name ? (
              <div className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm">
                Driver: {order.drivers.name}
              </div>
            ) : (
              <div className="rounded-full bg-white px-4 py-2 text-sm text-zinc-500 shadow-sm">
                Nog geen driver toegewezen
              </div>
            )}
          </div>

          <div className="mt-8 space-y-5">
            <Step
              active={getStep(order.status) >= 1}
              title="Bestelling ontvangen"
              text="Het restaurant heeft jouw bestelling ontvangen."
            />

            <Step
              active={getStep(order.status) >= 2}
              title="Bestelling geaccepteerd"
              text="Het restaurant heeft jouw bestelling geaccepteerd."
            />

            <Step
              active={getStep(order.status) >= 3}
              title="Wordt bereid"
              text="De keuken is bezig met jouw eten."
            />

            <Step
              active={getStep(order.status) >= 4}
              title="Klaar voor bezorging"
              text="Je bestelling wacht op een bezorger."
            />

            <Step
              active={getStep(order.status) >= 5}
              title="Bezorger toegewezen"
              text="Een bezorger heeft jouw bestelling geaccepteerd."
            />

            <Step
              active={getStep(order.status) >= 6}
              title="Onderweg"
              text="Jouw bestelling is onderweg."
            />

            <Step
              active={getStep(order.status) >= 7}
              title="Bezorgd"
              text="Eet smakelijk 🎉"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-zinc-50 p-4">
            <div className="text-sm font-semibold">Klantgegevens</div>

            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <div>
                <span className="text-zinc-500">Naam:</span>{" "}
                {order.customer_name}
              </div>

              <div>
                <span className="text-zinc-500">Telefoon:</span> {order.phone}
              </div>

              <div>
                <span className="text-zinc-500">Adres:</span> {order.address}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-50 p-4">
            <div className="text-sm font-semibold">Betaling</div>

            <div className="mt-3 space-y-2 text-sm text-zinc-700">
              <div>
                <span className="text-zinc-500">Betaalmethode:</span>{" "}
                {paymentMethodLabel(order.payment_method)}
              </div>

              <div>
                <span className="text-zinc-500">Betaalstatus:</span>{" "}
                {order.payment_status ?? "—"}
              </div>

              <div>
                <span className="text-zinc-500">Totaal:</span>{" "}
                {Number(order.total_price).toFixed(2)} MAD
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border p-4">
          <div className="text-sm font-semibold">Bestelde items</div>

          <div className="mt-4 space-y-3">
            {order.order_items?.length ? (
              order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="font-medium">
                      {item.menu_items?.name ?? "Onbekend product"}
                    </div>

                    <div className="text-sm text-zinc-500">
                      Aantal: {item.quantity}
                    </div>
                  </div>

                  <div className="text-sm font-medium">
                    {Number(item.price).toFixed(2)} MAD
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">Geen items gevonden.</div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            Terug naar home
          </Link>

          {String(order.payment_method ?? "").toLowerCase() === "online" ? (
            <Link
              href={`/return?order_id=${order.id}`}
              className="rounded-md border px-4 py-2 text-sm hover:bg-zinc-50"
            >
              Bekijk betaling
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Step({
  active,
  title,
  text,
}: {
  active: boolean;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div
        className={`mt-1 h-4 w-4 rounded-full ${
          active ? "bg-emerald-500" : "bg-zinc-300"
        }`}
      />

      <div>
        <div
          className={`font-medium ${
            active ? "text-zinc-950" : "text-zinc-400"
          }`}
        >
          {title}
        </div>

        <div className="mt-1 text-sm text-zinc-500">{text}</div>
      </div>
    </div>
  );
}