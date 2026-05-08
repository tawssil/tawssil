"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Restaurant = {
  id: number;
  name: string;
  address: string | null;
  city_id: number | null;
  is_active: boolean;
  created_at?: string;
};

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function loadRestaurants() {
    setErr(null);

    const { data, error } = await supabaseBrowser
      .from("restaurants")
      .select(`
        id,
        name,
        address,
        city_id,
        is_active,
        created_at
      `)
      .order("id", { ascending: false });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setRestaurants((data as Restaurant[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRestaurants();

    const channel = supabaseBrowser
      .channel("admin-restaurants")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurants",
        },
        () => {
          loadRestaurants();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  async function activateRestaurant(id: number) {
    const { error } = await supabaseBrowser
      .from("restaurants")
      .update({
        is_active: true,
      })
      .eq("id", id);

    if (error) {
      setErr(error.message);
      return;
    }

    loadRestaurants();
  }

  async function disableRestaurant(id: number) {
    const { error } = await supabaseBrowser
      .from("restaurants")
      .update({
        is_active: false,
      })
      .eq("id", id);

    if (error) {
      setErr(error.message);
      return;
    }

    loadRestaurants();
  }

  const pendingRestaurants = restaurants.filter((r) => !r.is_active);
  const activeRestaurants = restaurants.filter((r) => r.is_active);

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
          Restaurant beheer
        </h1>

        <p className="mt-2 text-sm text-zinc-600">
          Beheer restaurants op het Tawssil platform.
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
            Restaurants totaal
          </div>

          <div className="mt-2 text-3xl font-bold">
            {restaurants.length}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-zinc-500">
            Wacht op goedkeuring
          </div>

          <div className="mt-2 text-3xl font-bold text-orange-500">
            {pendingRestaurants.length}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-zinc-500">
            Actieve restaurants
          </div>

          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {activeRestaurants.length}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Nieuwe restaurant aanvragen
        </h2>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
            Laden...
          </div>
        ) : pendingRestaurants.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
            Geen nieuwe restaurant aanvragen.
          </div>
        ) : (
          pendingRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="rounded-3xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xl font-semibold">
                    {restaurant.name}
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    {restaurant.address ?? "Geen adres"}
                  </div>

                  <div className="mt-1 text-sm text-zinc-400">
                    Stad ID: {restaurant.city_id ?? "Geen stad"}
                  </div>
                </div>

                <button
                  onClick={() => activateRestaurant(restaurant.id)}
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
          Actieve restaurants
        </h2>

        {activeRestaurants.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">
            Geen actieve restaurants.
          </div>
        ) : (
          activeRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="rounded-3xl border bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xl font-semibold">
                    {restaurant.name}
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    {restaurant.address ?? "Geen adres"}
                  </div>

                  <div className="mt-1 text-sm text-zinc-400">
                    Stad ID: {restaurant.city_id ?? "Geen stad"}
                  </div>

                  <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Actief
                  </div>
                </div>

                <button
                  onClick={() => disableRestaurant(restaurant.id)}
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