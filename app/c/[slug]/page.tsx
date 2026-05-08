export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getOpenState } from "@/lib/openingHours";

type Restaurant = {
  id: number;
  name: string;
  address: string | null;
  delivery_fee: number | null;
  is_active: boolean | null;
  logo_url: string | null;
  cover_url: string | null;
  rating: number | null;
  eta_min: number | null;
  opening_hours: unknown;
  timezone: string | null;
};

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: city, error: cityErr } = await supabase
    .from("cities")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (cityErr || !city) notFound();

  const { data: restaurants, error: restErr } = await supabase
    .from("restaurants")
    .select(
      "id, name, address, delivery_fee, is_active, logo_url, cover_url, rating, eta_min, opening_hours, timezone"
    )
    .eq("city_id", city.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Terug
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Restaurants in {city.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Kies een restaurant om het menu te bekijken.
          </p>
        </div>
      </div>

      {restErr ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {restErr.message}
        </div>
      ) : !restaurants || restaurants.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-600 shadow-sm">
          Nog geen restaurants gevonden in deze stad.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {restaurants.map((r: Restaurant) => {
            const openState = getOpenState(r.opening_hours);

            return (
              <Link
                key={r.id}
                href={`/r/${r.id}`}
                className="group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {r.cover_url ? (
                  <img
                    src={r.cover_url}
                    alt={r.name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-zinc-100 text-sm text-zinc-500">
                    Geen coverfoto
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {r.logo_url ? (
                      <img
                        src={r.logo_url}
                        alt={r.name}
                        className="h-14 w-14 rounded-2xl border object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-zinc-100 text-xs text-zinc-500">
                        Logo
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold tracking-tight">
                            {r.name}
                          </div>
                          <div className="mt-1 text-sm text-zinc-600">
                            {r.address ?? "Adres onbekend"}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                            openState.isOpen
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {openState.isOpen ? "Open" : "Gesloten"}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
                          ⭐ {Number(r.rating ?? 4.5).toFixed(1)}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
                          🚚 {r.eta_min ?? 30} min
                        </span>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
                          {Number(r.delivery_fee ?? 0).toFixed(2)} MAD
                        </span>
                      </div>

                      <div className="mt-4 text-sm font-medium text-zinc-900">
                        {openState.label}
                      </div>

                      <div className="mt-4 text-sm font-medium text-zinc-900 underline underline-offset-4">
                        Bekijk menu →
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}