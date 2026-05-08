"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Driver = {
  id: number;
  user_id: string;
  name: string;
  phone: string | null;
};

type Order = {
  id: number;
  customer_name: string;
  phone: string;
  address: string;
  total_price: number;
  status: string;
  created_at: string;
  driver_id: number | null;
};

function statusLabel(status: string) {
  const s = String(status ?? "").toLowerCase();

  if (s === "ready") return "Beschikbaar";
  if (s === "assigned") return "Door jou geaccepteerd";
  if (s === "picked_up") return "Onderweg";
  if (s === "delivered") return "Bezorgd";

  return status;
}

export default function DriverDashboardPage() {
  const router = useRouter();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  async function loadDriver() {
    const {
      data: { user },
      error: userErr,
    } = await supabaseBrowser.auth.getUser();

    if (userErr || !user) {
      router.push("/driver/login");
      return null;
    }

    const { data, error } = await supabaseBrowser
      .from("drivers")
      .select("id, user_id, name, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      setLoading(false);
      return null;
    }

    if (!data) {
      setErr("Geen driver profiel gevonden voor deze gebruiker.");
      setLoading(false);
      return null;
    }

    setDriver(data as Driver);
    return data as Driver;
  }

  async function loadOrders(activeDriver?: Driver | null) {
    const d = activeDriver ?? driver;

    if (!d) return;

    setErr(null);

    const { data, error } = await supabaseBrowser
      .from("orders")
      .select(`
        id,
        customer_name,
        phone,
        address,
        total_price,
        status,
        created_at,
        driver_id
      `)
      .or(`status.eq.ready,driver_id.eq.${d.id}`)
      .in("status", ["ready", "assigned", "picked_up"])
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const filtered = ((data as Order[]) ?? []).filter((order) => {
      if (order.status === "ready") return order.driver_id === null;
      return order.driver_id === d.id;
    });

    setOrders(filtered);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const d = await loadDriver();

      if (!d || cancelled) return;

      await loadOrders(d);

      const channel = supabaseBrowser
        .channel(`driver-orders-${d.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            loadOrders(d);
          }
        )
        .subscribe();

      return () => {
        supabaseBrowser.removeChannel(channel);
      };
    }

    const cleanupPromise = init();

    return () => {
      cancelled = true;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      cleanupPromise.then((cleanup) => {
        if (cleanup) cleanup();
      });
    };
  }, []);

  async function updateOrder(orderId: number, patch: Record<string, any>) {
    setErr(null);

    const { error } = await supabaseBrowser
      .from("orders")
      .update(patch)
      .eq("id", orderId);

    if (error) {
      setErr(error.message);
      return;
    }

    await loadOrders();
  }

  async function acceptOrder(orderId: number) {
    if (!driver) return;

    await updateOrder(orderId, {
      status: "assigned",
      driver_id: driver.id,
      assigned_at: new Date().toISOString(),
    });
  }

  async function pickupOrder(orderId: number) {
    await updateOrder(orderId, {
      status: "picked_up",
      picked_up_at: new Date().toISOString(),
    });
  }

  async function deliverOrder(orderId: number) {
    await updateOrder(orderId, {
      status: "delivered",
      delivered_at: new Date().toISOString(),
    });
  }

  async function saveLocation(lat: number, lng: number) {
    if (!driver) return;

    const { error } = await supabaseBrowser
      .from("driver_locations")
      .upsert(
        {
          driver_id: driver.id,
          lat,
          lng,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "driver_id",
        }
      );

    if (error) {
      setLocationMsg(error.message);
      return;
    }

    setLocationMsg(
      `Locatie gedeeld: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );
  }

  function startLocationSharing() {
    setErr(null);
    setLocationMsg(null);

    if (!driver) {
      setLocationMsg("Geen driver profiel gevonden.");
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationMsg("GPS wordt niet ondersteund door deze browser.");
      return;
    }

    setSharingLocation(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        await saveLocation(lat, lng);
      },
      (error) => {
        setSharingLocation(false);
        setLocationMsg(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }

  function stopLocationSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setSharingLocation(false);
    setLocationMsg("Locatie delen gestopt.");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Driver Dashboard
          </h1>

          <p className="mt-2 text-sm text-zinc-600">
            Bekijk beschikbare bestellingen en jouw actieve bezorgingen.
          </p>

          {driver ? (
            <p className="mt-2 text-sm text-zinc-500">
              Ingelogd als bezorger:{" "}
              <span className="font-medium text-zinc-900">
                {driver.name}
              </span>
            </p>
          ) : null}
        </div>

        <a
          href="/driver/logout"
          className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Uitloggen
        </a>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Live locatie</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Deel je GPS-locatie zodat klanten je bezorging live kunnen volgen.
            </p>

            {locationMsg ? (
              <div className="mt-3 text-sm text-zinc-500">
                {locationMsg}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            {!sharingLocation ? (
              <button
                onClick={startLocationSharing}
                className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Locatie delen starten
              </button>
            ) : (
              <button
                onClick={stopLocationSharing}
                className="rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Stop locatie delen
              </button>
            )}
          </div>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-600">
          Laden...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
          Geen beschikbare of actieve bestellingen.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-3xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    Bestelling #{order.id}
                  </div>

                  <div className="text-sm text-zinc-500">
                    {new Date(order.created_at).toLocaleString()}
                  </div>

                  <div className="pt-2 text-sm text-zinc-700">
                    <span className="text-zinc-500">Klant:</span>{" "}
                    {order.customer_name}
                  </div>

                  <div className="text-sm text-zinc-700">
                    <span className="text-zinc-500">Telefoon:</span>{" "}
                    {order.phone}
                  </div>

                  <div className="text-sm text-zinc-700">
                    <span className="text-zinc-500">Adres:</span>{" "}
                    {order.address}
                  </div>

                  <div className="pt-2 text-lg font-semibold">
                    {Number(order.total_price).toFixed(2)} MAD
                  </div>
                </div>

                <div className="flex min-w-56 flex-col gap-3">
                  <div className="rounded-full bg-zinc-100 px-4 py-2 text-center text-sm font-medium">
                    {statusLabel(order.status)}
                  </div>

                  {order.status === "ready" ? (
                    <button
                      onClick={() => acceptOrder(order.id)}
                      className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Accepteer bestelling
                    </button>
                  ) : null}

                  {order.status === "assigned" ? (
                    <button
                      onClick={() => pickupOrder(order.id)}
                      className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Onderweg
                    </button>
                  ) : null}

                  {order.status === "picked_up" ? (
                    <button
                      onClick={() => deliverOrder(order.id)}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Bezorgd
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}