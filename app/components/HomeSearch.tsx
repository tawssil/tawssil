"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type City = {
  id: number;
  name: string;
  slug: string;
};

export default function HomeSearch({
  placeholder = "Waar wil je bestellen?",
}: {
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);

  const q = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (q.length < 1) {
      setCities([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);

      const { data, error } = await supabaseBrowser
        .from("cities")
        .select("id, name, slug")
        .ilike("name", `${q}%`)
        .order("name")
        .limit(10);

      if (error) {
        console.error(error.message);
        setCities([]);
      } else {
        setCities((data as City[]) ?? []);
      }

      setLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative">
      <input
        id="city-search"
        name="city-search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-5 text-base shadow-sm outline-none transition focus:border-black"
      />

      <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-zinc-400">
        ⌕
      </div>

      {q.length >= 1 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          {loading ? (
            <div className="p-4 text-sm text-zinc-500">
              Zoeken...
            </div>
          ) : cities.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500">
              Geen stad gevonden.
            </div>
          ) : (
            <div className="divide-y">
              {cities.map((city) => (
                <Link
                  key={city.id}
                  href={`/c/${city.slug}`}
                  className="flex items-center justify-between px-5 py-4 transition hover:bg-zinc-50"
                >
                  <div>
                    <div className="font-medium text-zinc-900">
                      {city.name}
                    </div>

                    <div className="text-sm text-zinc-500">
                      Bekijk restaurants
                    </div>
                  </div>

                  <div className="text-zinc-400">→</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}