"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HomeSearch from "./components/HomeSearch";
import LanguageSwitcher from "./components/LanguageSwitcher";
import RestaurantCard from "./components/RestaurantCard";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { translations, Language } from "@/lib/translations";
import { getOpenState } from "@/lib/openingHours";

type Restaurant = {
  id: number;
  name: string;
  address: string | null;
  delivery_fee: number | null;
  logo_url: string | null;
  cover_url: string | null;
  rating: number | null;
  eta_min: number | null;
  opening_hours: unknown;
  is_active: boolean | null;
};

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("fr");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("language");

    if (saved) {
      setLanguage(saved as Language);
    }

    loadRestaurants();
  }, []);

  function changeLanguage(lang: Language) {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  }

  async function loadRestaurants() {
    setLoadingRestaurants(true);

    const { data } = await supabaseBrowser
      .from("restaurants")
      .select(
        "id, name, address, delivery_fee, logo_url, cover_url, rating, eta_min, opening_hours, is_active"
      )
      .eq("is_active", true)
      .order("rating", { ascending: false })
      .limit(6);

    setRestaurants((data as Restaurant[]) ?? []);
    setLoadingRestaurants(false);
  }

  const t = translations[language];

  return (
    <main className="min-h-screen bg-[#f6f7f5]">
      <div className="mx-auto max-w-7xl px-3 py-4 md:px-8 md:py-10">
        <section className="relative overflow-hidden rounded-[28px] border bg-white shadow-sm md:rounded-[40px]">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-white to-emerald-100" />
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-orange-300/30 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl" />

          <div className="relative p-5 md:p-10">
            <nav className="mb-8 space-y-4 md:mb-10 md:flex md:items-center md:justify-between md:space-y-0">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-2xl font-black tracking-tight">
                  Tawssil
                </Link>

                <div className="md:hidden">
                  <LanguageSwitcher value={language} onChange={changeLanguage} />
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="hidden md:block">
                  <LanguageSwitcher value={language} onChange={changeLanguage} />
                </div>

                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                  <Link
                    href="/restaurant/login"
                    className="rounded-xl border bg-white/90 px-3 py-2 text-center text-sm font-medium shadow-sm hover:bg-white md:px-4"
                  >
                    {t.restaurantLogin}
                  </Link>

                  <Link
                    href="/driver/signup"
                    className="rounded-xl border bg-white/90 px-3 py-2 text-center text-sm font-medium shadow-sm hover:bg-white md:px-4"
                  >
                    {t.becomeDriver}
                  </Link>
                </div>
              </div>
            </nav>

            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Morocco Delivery Platform
                </div>

                <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
                  {t.heroTitle}
                </h1>

                <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 md:mt-5 md:text-lg">
                  {t.heroText}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-600 md:gap-3 md:text-sm">
                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    ⭐ 4.6 rating
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    🚚 Fast delivery
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                    📍 Live tracking
                  </span>
                </div>

                <div className="mt-7 max-w-2xl md:mt-8">
                  <HomeSearch placeholder={t.searchPlaceholder} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-7">
                  <Link
                    href="/orders"
                    className="rounded-2xl bg-black px-6 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                  >
                    {t.myOrders}
                  </Link>

                  <Link
                    href="/restaurant/login"
                    className="rounded-2xl border bg-white px-6 py-3 text-center text-sm font-semibold shadow-sm hover:bg-zinc-50"
                  >
                    {t.restaurantLogin}
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[28px] bg-zinc-950 p-6 text-white shadow-2xl md:rounded-[34px] md:p-7">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/30 blur-2xl" />

                  <div className="text-sm text-zinc-400">Popular today</div>

                  <div className="mt-3 text-2xl font-black tracking-tight md:mt-4 md:text-3xl">
                    Pizza, tacos, grills & fresh fish
                  </div>

                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    Restaurants receive orders instantly and update status live.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2 text-xs md:mt-7">
                    {["🐟 Dorade", "🍕 Pizza", "🌮 Tacos", "🔥 Grill"].map(
                      (item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white/10 px-3 py-1"
                        >
                          {item}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border bg-white/90 p-6 shadow-sm md:rounded-[34px] md:p-7">
                  <div className="text-sm font-medium text-zinc-500">
                    Tawssil
                  </div>

                  <div className="mt-5 space-y-5">
                    <Reason
                      title="Realtime restaurant dashboard"
                      text="Orders arrive instantly."
                    />

                    <Reason
                      title="Live order tracking"
                      text="Customers follow every step."
                    />

                    <Reason
                      title="Driver system"
                      text="Drivers accept orders live."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 md:mt-14">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">
              {t.popularRestaurants}
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Discover popular local restaurants.
            </p>
          </div>

          {loadingRestaurants ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-72 animate-pulse rounded-[28px] border bg-white shadow-sm"
                />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="mt-6 rounded-3xl border bg-white p-6 text-sm text-zinc-500 shadow-sm">
              Nog geen restaurants beschikbaar.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((restaurant) => {
                const openState = getOpenState(restaurant.opening_hours);

                return (
                  <RestaurantCard
                    key={restaurant.id}
                    id={restaurant.id}
                    name={restaurant.name}
                    address={restaurant.address}
                    logoUrl={restaurant.logo_url}
                    coverUrl={restaurant.cover_url}
                    rating={restaurant.rating}
                    etaMin={restaurant.eta_min}
                    deliveryFee={restaurant.delivery_fee}
                    isOpen={openState.isOpen}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Reason({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </div>

      <div>
        <h3 className="font-semibold text-zinc-950">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-zinc-500">{text}</p>
      </div>
    </div>
  );
}