"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HomeSearch from "./components/HomeSearch";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { translations, Language } from "@/lib/translations";

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("fr");

  useEffect(() => {
    const saved = localStorage.getItem("language");

    if (saved) {
      setLanguage(saved as Language);
    }
  }, []);

  function changeLanguage(lang: Language) {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  }

  const t = translations[language];

  return (
    <main className="min-h-screen bg-[#f6f7f5]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <section className="relative overflow-hidden rounded-[40px] border bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-white to-emerald-100" />

          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange-300/30 blur-3xl" />
          <div className="absolute -bottom-20 left-20 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl" />

          <div className="relative px-6 py-8 md:px-10">
            <nav className="mb-10 flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="text-2xl font-black tracking-tight">
                Tawssil
              </Link>

              <div className="flex items-center gap-3">
                <LanguageSwitcher
                  value={language}
                  onChange={changeLanguage}
                />

                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/restaurant/login"
                    className="rounded-xl border bg-white/80 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white"
                  >
                    {t.restaurantLogin}
                  </Link>

                  <Link
                    href="/driver/signup"
                    className="rounded-xl border bg-white/80 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white"
                  >
                    {t.becomeDriver}
                  </Link>
                </div>
              </div>
            </nav>

            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Morocco Delivery Platform
                </div>

                <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.03] tracking-tight text-zinc-950 md:text-6xl">
                  {t.heroTitle}
                </h1>

                <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 md:text-lg">
                  {t.heroText}
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-600">
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

                <div className="mt-8 max-w-2xl">
                  <HomeSearch
                    placeholder={t.searchPlaceholder}
                  />
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/orders"
                    className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                  >
                    {t.myOrders}
                  </Link>

                  <Link
                    href="/restaurant/login"
                    className="rounded-2xl border bg-white px-6 py-3 text-sm font-semibold shadow-sm hover:bg-zinc-50"
                  >
                    {t.restaurantLogin}
                  </Link>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-full space-y-4">
                  <div className="relative overflow-hidden rounded-[34px] bg-zinc-950 p-7 text-white shadow-2xl">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/30 blur-2xl" />

                    <div className="text-sm text-zinc-400">
                      Popular today
                    </div>

                    <div className="mt-4 text-3xl font-black tracking-tight">
                      Pizza, tacos, grills & fresh fish
                    </div>

                    <p className="mt-3 text-sm leading-6 text-zinc-300">
                      Restaurants receive orders instantly and update status
                      live.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-2 text-xs">
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

                  <div className="rounded-[34px] border bg-white/90 p-7 shadow-sm">
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
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-zinc-950">
                {t.popularRestaurants}
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Discover popular local restaurants.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Reason({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </div>

      <div>
        <h3 className="font-semibold text-zinc-950">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-zinc-500">
          {text}
        </p>
      </div>
    </div>
  );
}