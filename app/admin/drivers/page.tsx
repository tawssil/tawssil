"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Driver = {
  id: number;
  name: string;
  phone: string | null;
  user_id: string;
  is_active: boolean;
  approved: boolean;
  created_at?: string;
};

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function loadDrivers() {
    setErr(null);

    const { data, error } = await supabaseBrowser
      .from("drivers")
      .select(`
        id,
        name,
        phone,
        user_id,
        is_active,
        approved,
        created_at
      `)
      .order("id", { ascending: false });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setDrivers((data as Driver[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadDrivers();

    const channel = supabaseBrowser
      .channel("admin-drivers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drivers",
        },
        () => {
          loadDrivers();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  async function approveDriver(driverId: number) {
    const { error } = await supabaseBrowser
      .from("drivers")
      .update({
        approved: true,
        is_active: true,
      })
      .eq("id", driverId);

    if (error) {
      setErr(error.message);
      return;
    }

    loadDrivers();
  }

  async function disableDriver(driverId: number) {
    const { error } = await supabaseBrowser
      .from("drivers")
      .update({
        approved: false,
        is_active: false,
      })
      .eq("id", driverId);

    if (error) {
      setErr(error.message);
      return;
    }

    loadDrivers();
  }

  const pendingDrivers = drivers.filter((d) => !d.approved);
  const activeDrivers = drivers.filter((d) => d.approved);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">

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
          Driver beheer
        </h1>

        <p className="mt-2 text-sm text-zinc-600">
          Keur drivers goed en beheer actieve bezorgers.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-zinc-500">
            Totaal drivers
          </div>

          <div className="mt-2 text-3xl font-bold">
            {drivers.length}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-zinc-500">
            Wacht op goedkeuring
          </div>

          <div className="mt-2 text-3xl font-bold text-orange-500">
            {pendingDrivers.length}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-zinc-500">
            Actieve drivers
          </div>

          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {activeDrivers.length}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Nieuwe aanvragen
        </h2>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
            Laden...
          </div>
        ) : pendingDrivers.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
            Geen nieuwe driver aanvragen.
          </div>
        ) : (
          pendingDrivers.map((driver) => (
            <div
              key={driver.id}
              className="rounded-3xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xl font-semibold">
                    {driver.name}
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    {driver.phone}
                  </div>

                  <div className="mt-2 text-xs text-zinc-400">
                    User ID: {driver.user_id}
                  </div>
                </div>

                <button
                  onClick={() => approveDriver(driver.id)}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Goedkeuren
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Actieve drivers
        </h2>

        {activeDrivers.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
            Geen actieve drivers.
          </div>
        ) : (
          activeDrivers.map((driver) => (
            <div
              key={driver.id}
              className="rounded-3xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xl font-semibold">
                    {driver.name}
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    {driver.phone}
                  </div>

                  <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Actief
                  </div>
                </div>

                <button
                  onClick={() => disableDriver(driver.id)}
                  className="rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Blokkeren
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}