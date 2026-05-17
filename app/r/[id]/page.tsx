"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { getOpenState } from "@/lib/openingHours";

type Restaurant = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  delivery_fee: number | null;
  logo_url: string | null;
  cover_url: string | null;
  rating: number | null;
  eta_min: number | null;
  opening_hours: unknown;
  timezone: string | null;
  minimum_order: number | null;
};

type Category = {
  id: number;
  name: string;
};

type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category_id: number | null;
  image_url: string | null;
};

export default function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});

  const restaurantIdPromise = params;

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);

      const { id } = await restaurantIdPromise;
      const restaurantId = Number(id);

      if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
        setErr("Ongeldig restaurant.");
        setLoading(false);
        return;
      }

      const { data: restaurantData, error: restErr } = await supabaseBrowser
        .from("restaurants")
        .select(`
          id,
          name,
          address,
          phone,
          delivery_fee,
          logo_url,
          cover_url,
          rating,
          eta_min,
          opening_hours,
          timezone,
          minimum_order
        `)
        .eq("id", restaurantId)
        .maybeSingle();

      if (restErr || !restaurantData) {
        setErr(restErr?.message ?? "Restaurant niet gevonden.");
        setLoading(false);
        return;
      }

      const { data: categoryData, error: catErr } = await supabaseBrowser
        .from("categories")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (catErr) {
        setErr(catErr.message);
        setLoading(false);
        return;
      }

      const { data: itemData, error: itemErr } = await supabaseBrowser
        .from("menu_items")
        .select(`
          id,
          name,
          description,
          price,
          category_id,
          image_url
        `)
        .eq("restaurant_id", restaurantId)
        .order("id");

      if (itemErr) {
        setErr(itemErr.message);
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData as Restaurant);
      setCategories((categoryData as Category[]) ?? []);
      setItems((itemData as MenuItem[]) ?? []);
      setLoading(false);
    })();
  }, [restaurantIdPromise]);

  function addToCart(item: MenuItem) {
    if (!restaurant) return;

    const openState = getOpenState(restaurant.opening_hours);

    if (!openState.isOpen) return;

    setCart((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] ?? 0) + 1,
    }));
  }

  function removeFromCart(itemId: number) {
    setCart((prev) => {
      const current = prev[itemId] ?? 0;

      if (current <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }

      return {
        ...prev,
        [itemId]: current - 1,
      };
    });
  }

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, q) => sum + q, 0),
    [cart]
  );

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = cart[item.id] ?? 0;
      return sum + qty * Number(item.price ?? 0);
    }, 0);
  }, [cart, items]);

  const cartItemsForCheckout = useMemo(() => {
    return Object.entries(cart)
      .map(([menuItemId, quantity]) => ({
        menu_item_id: Number(menuItemId),
        quantity,
      }))
      .filter((x) => x.quantity > 0);
  }, [cart]);

  const checkoutHref = useMemo(() => {
    if (!restaurant || cartItemsForCheckout.length === 0) return "#";

    const qs = new URLSearchParams({
      restaurant_id: String(restaurant.id),
      items: JSON.stringify(cartItemsForCheckout),
    });

    return `/checkout?${qs.toString()}`;
  }, [restaurant, cartItemsForCheckout]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();

    for (const cat of categories) {
      const catItems = items.filter((i) => i.category_id === cat.id);

      if (catItems.length > 0) {
        map.set(cat.name, catItems);
      }
    }

    const uncategorized = items.filter((i) => i.category_id == null);

    if (uncategorized.length > 0) {
      map.set("Overig", uncategorized);
    }

    return Array.from(map.entries());
  }, [categories, items]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-600 shadow-sm">
        Laden…
      </div>
    );
  }

  if (err || !restaurant) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {err ?? "Restaurant niet gevonden."}
      </div>
    );
  }

  const openState = getOpenState(restaurant.opening_hours);

  const minimumOrder = Number(restaurant.minimum_order ?? 0);

  const belowMinimum =
    subtotal > 0 && subtotal < minimumOrder;

  const remaining = Math.max(
    0,
    minimumOrder - subtotal
  );

  return (
    <div className="space-y-8 pb-40">
      <Link
        href="/"
        className="inline-flex text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Terug
      </Link>

      {/* HERO */}
      <section className="overflow-hidden rounded-[32px] border bg-white shadow-sm">
        {restaurant.cover_url ? (
          <img
            src={restaurant.cover_url}
            alt={restaurant.name}
            className="h-64 w-full object-cover md:h-80"
          />
        ) : (
          <div className="flex h-64 items-center justify-center bg-zinc-100 text-sm text-zinc-500 md:h-80">
            Geen coverfoto
          </div>
        )}

        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="h-24 w-24 rounded-3xl border object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border bg-zinc-100 text-sm text-zinc-500">
                  Logo
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {restaurant.name}
                  </h1>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      openState.isOpen
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {openState.isOpen ? "Open" : "Gesloten"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    ⭐ {Number(restaurant.rating ?? 4.5).toFixed(1)}
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    🚚 {restaurant.eta_min ?? 30} min
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    {Number(
                      restaurant.delivery_fee ?? 0
                    ).toFixed(2)}{" "}
                    MAD
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1">
                    Minimum{" "}
                    {minimumOrder.toFixed(2)} MAD
                  </span>
                </div>

                <div className="mt-4 space-y-1 text-sm text-zinc-600">
                  <div>{restaurant.address}</div>
                  <div>{restaurant.phone}</div>
                  <div className="font-medium">
                    {openState.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY NAV */}
      {grouped.length > 0 ? (
        <div className="sticky top-2 z-20 overflow-x-auto rounded-2xl border bg-white p-3 shadow-sm">
          <div className="flex gap-2">
            {grouped.map(([categoryName]) => (
              <a
                key={categoryName}
                href={`#cat-${categoryName}`}
                className="whitespace-nowrap rounded-full border px-4 py-2 text-sm hover:bg-zinc-50"
              >
                {categoryName}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* MENU */}
      <div className="space-y-10">
        {grouped.map(([categoryName, categoryItems]) => (
          <section
            key={categoryName}
            id={`cat-${categoryName}`}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                {categoryName}
              </h2>

              <div className="text-sm text-zinc-500">
                {categoryItems.length} items
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {categoryItems.map((item) => {
                const qty = cart[item.id] ?? 0;

                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-[28px] border bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="h-48 w-full overflow-hidden bg-zinc-100">
  {item.image_url ? (
    <img
      src={item.image_url}
      alt={item.name}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      Geen foto
    </div>
  )}
</div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold tracking-tight">
                            {item.name}
                          </div>

                          <div className="mt-2 text-sm leading-6 text-zinc-600">
                            {item.description ??
                              "Geen beschrijving"}
                          </div>
                        </div>

                        <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium">
                          {Number(item.price).toFixed(2)} MAD
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2">
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!openState.isOpen}
                          className="inline-flex rounded-xl bg-black px-4 py-2 text-sm text-white transition hover:bg-zinc-800 disabled:opacity-50"
                        >
                          Voeg toe
                        </button>

                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() =>
                                removeFromCart(item.id)
                              }
                              className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
                            >
                              -
                            </button>

                            <div className="min-w-8 text-center text-sm font-medium">
                              {qty}
                            </div>

                            <button
                              onClick={() => addToCart(item)}
                              disabled={!openState.isOpen}
                              className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                            >
                              +
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* FLOATING CART */}
      <div className="fixed bottom-5 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
        <div className="rounded-2xl border bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">
                {cartCount} item(s)
              </div>

              <div className="text-sm text-zinc-600">
                {subtotal.toFixed(2)} MAD
              </div>
            </div>

            {belowMinimum ? (
              <div className="text-right text-xs text-amber-700">
                Voeg nog{" "}
                {remaining.toFixed(2)} MAD toe
              </div>
            ) : null}
          </div>

          {cartCount > 0 &&
          openState.isOpen &&
          !belowMinimum ? (
            <Link
              href={checkoutHref}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Ga naar checkout
            </Link>
          ) : !openState.isOpen ? (
            <button
              disabled
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border px-5 py-3 text-sm text-zinc-400"
            >
              Restaurant gesloten
            </button>
          ) : belowMinimum ? (
            <button
              disabled
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border px-5 py-3 text-sm text-zinc-400"
            >
              Minimum niet bereikt
            </button>
          ) : (
            <button
              disabled
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border px-5 py-3 text-sm text-zinc-400"
            >
              Voeg items toe
            </button>
          )}
        </div>
      </div>
    </div>
  );
}