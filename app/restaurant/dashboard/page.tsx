"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Restaurant = {
  id: number;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  rating: number | null;
  eta_min: number | null;
  minimum_order: number | null;
};

export default function RestaurantDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [rating, setRating] = useState("4.5");
  const [etaMin, setEtaMin] = useState("30");
  const [minimumOrder, setMinimumOrder] = useState("0");
  const [savingMeta, setSavingMeta] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErrorMsg(null);
      setLoading(true);

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      if (!sessionData.session) {
        router.push("/restaurant/login");
        return;
      }

      const {
        data: { user },
        error: userErr,
      } = await supabaseBrowser.auth.getUser();

      if (userErr || !user) {
        if (!cancelled) {
          setErrorMsg(userErr?.message ?? "Geen user gevonden.");
          setLoading(false);
        }
        return;
      }

      const { data: ru, error: ruErr } = await supabaseBrowser
        .from("restaurant_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ruErr) {
        if (!cancelled) {
          setErrorMsg(ruErr.message);
          setLoading(false);
        }
        return;
      }

      const rid = ru?.restaurant_id ?? null;
      if (!rid) {
        router.push("/restaurant/onboarding");
        return;
      }

      const { data: rest, error: restErr } = await supabaseBrowser
        .from("restaurants")
        .select("id, name, logo_url, cover_url, rating, eta_min, minimum_order")
        .eq("id", rid)
        .maybeSingle();

      if (restErr) {
        if (!cancelled) {
          setErrorMsg(restErr.message);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setRestaurantId(rid);
        setRestaurant(rest ?? null);
        setRating(String(rest?.rating ?? 4.5));
        setEtaMin(String(rest?.eta_min ?? 30));
        setMinimumOrder(String(rest?.minimum_order ?? 0));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleUpload(
    file: File,
    bucket: "restaurant-logos" | "restaurant-covers",
    kind: "logo_url" | "cover_url"
  ) {
    if (!restaurantId) return;

    if (kind === "logo_url") setUploadingLogo(true);
    if (kind === "cover_url") setUploadingCover(true);
    setErrorMsg(null);

    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `restaurant-${restaurantId}/${kind}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabaseBrowser.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(filePath);
      const url = data.publicUrl;

      const { error: updateErr } = await supabaseBrowser
        .from("restaurants")
        .update({ [kind]: url })
        .eq("id", restaurantId);

      if (updateErr) throw updateErr;

      setRestaurant((prev) => (prev ? { ...prev, [kind]: url } as Restaurant : prev));
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Upload mislukt");
    } finally {
      if (kind === "logo_url") setUploadingLogo(false);
      if (kind === "cover_url") setUploadingCover(false);
    }
  }

  async function saveMeta() {
    if (!restaurantId) return;
    setSavingMeta(true);
    setErrorMsg(null);

    const parsedRating = Number(String(rating).replace(",", "."));
    const parsedEta = Number(etaMin);
    const parsedMinimum = Number(String(minimumOrder).replace(",", "."));

    const { error } = await supabaseBrowser
      .from("restaurants")
      .update({
        rating: Number.isFinite(parsedRating) ? parsedRating : 4.5,
        eta_min: Number.isFinite(parsedEta) ? parsedEta : 30,
        minimum_order: Number.isFinite(parsedMinimum) ? parsedMinimum : 0,
      })
      .eq("id", restaurantId);

    if (error) {
      setErrorMsg(error.message);
      setSavingMeta(false);
      return;
    }

    setRestaurant((prev) =>
      prev
        ? {
            ...prev,
            rating: Number.isFinite(parsedRating) ? parsedRating : prev.rating,
            eta_min: Number.isFinite(parsedEta) ? parsedEta : prev.eta_min,
            minimum_order: Number.isFinite(parsedMinimum) ? parsedMinimum : prev.minimum_order,
          }
        : prev
    );

    setSavingMeta(false);
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="text-sm text-zinc-600">Laden…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {restaurant?.cover_url ? (
          <img
            src={restaurant.cover_url}
            alt="Restaurant cover"
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="flex h-56 items-center justify-center bg-zinc-100 text-sm text-zinc-500">
            Geen coverfoto
          </div>
        )}

        <div className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              {restaurant?.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt="Restaurant logo"
                  className="h-20 w-20 rounded-xl border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border bg-zinc-100 text-sm text-zinc-500">
                  Geen logo
                </div>
              )}

              <div>
                <h1 className="text-2xl font-bold tracking-tight">Overzicht</h1>
                <p className="mt-1 text-sm text-zinc-600">
                  Ingelogd als <span className="font-medium">{restaurant?.name}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-700">
                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    ⭐ {Number(restaurant?.rating ?? 4.5).toFixed(1)}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    🚚 {restaurant?.eta_min ?? 30} min
                  </span>
                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    Minimum {Number(restaurant?.minimum_order ?? 0).toFixed(2)} MAD
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="cursor-pointer rounded-md border px-4 py-2 text-sm hover:bg-zinc-50">
                {uploadingLogo ? "Logo uploaden..." : "Logo uploaden"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, "restaurant-logos", "logo_url");
                  }}
                />
              </label>

              <label className="cursor-pointer rounded-md border px-4 py-2 text-sm hover:bg-zinc-50">
                {uploadingCover ? "Cover uploaden..." : "Cover uploaden"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, "restaurant-covers", "cover_url");
                  }}
                />
              </label>

              <Link
                href="/restaurant/dashboard/menu"
                className="inline-flex rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
              >
                Producten beheren
              </Link>
            </div>
          </div>

          {errorMsg ? (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 rounded-xl border p-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Rating</label>
              <input
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="4.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Bezorgtijd (min)</label>
              <input
                value={etaMin}
                onChange={(e) => setEtaMin(e.target.value)}
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="30"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Minimum bestelling</label>
              <input
                value={minimumOrder}
                onChange={(e) => setMinimumOrder(e.target.value)}
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="80"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={saveMeta}
                disabled={savingMeta}
                className="w-full rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {savingMeta ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/restaurant/dashboard/menu"
          className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="text-sm font-semibold">Producten</div>
          <div className="mt-1 text-sm text-zinc-600">
            Categorieën en menu-items beheren
          </div>
          <div className="mt-4 text-sm text-zinc-900 underline underline-offset-4">
            Open producten →
          </div>
        </Link>

        <Link
          href="/restaurant/dashboard/orders"
          className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="text-sm font-semibold">Bestellingen</div>
          <div className="mt-1 text-sm text-zinc-600">
            Nieuwe en lopende bestellingen bekijken
          </div>
          <div className="mt-4 text-sm text-zinc-900 underline underline-offset-4">
            Open bestellingen →
          </div>
        </Link>
      </div>
    </div>
  );
}