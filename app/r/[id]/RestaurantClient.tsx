"use client";

import { useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
};

type MenuItem = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

export default function RestaurantClient(props: {
  restaurantId: number;
  restaurantName: string;
  deliveryFee: number;
  categories: Category[];
  menuItems: MenuItem[];
}) {
  const { restaurantId, restaurantName, deliveryFee, categories, menuItems } =
    props;

  const itemsByCategory = useMemo(() => {
    const map = new Map<number, MenuItem[]>();

    for (const item of menuItems) {
      const arr = map.get(item.category_id) ?? [];
      arr.push(item);
      map.set(item.category_id, arr);
    }

    return map;
  }, [menuItems]);

  const [cart, setCart] = useState<Record<number, number>>({});

  function addItem(id: number) {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));
  }

  function removeItem(id: number) {
    setCart((prev) => {
      const current = prev[id] ?? 0;

      if (current <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }

      return {
        ...prev,
        [id]: current - 1,
      };
    });
  }

  const cartLines = useMemo(() => {
    const byId = new Map(menuItems.map((m) => [m.id, m]));

    return Object.entries(cart)
      .map(([idStr, qty]) => {
        const id = Number(idStr);
        const item = byId.get(id);

        if (!item) return null;

        return {
          id,
          qty,
          name: item.name,
          price: Number(item.price),
          lineTotal: Number(item.price) * qty,
        };
      })
      .filter(Boolean) as {
      id: number;
      qty: number;
      name: string;
      price: number;
      lineTotal: number;
    }[];
  }, [cart, menuItems]);

  const subTotal = cartLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const total = subTotal + Number(deliveryFee);
  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <div className="mt-8 space-y-8">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="font-medium">Winkelwagen</div>

        <div className="mt-2 text-sm text-gray-500">
          {restaurantName} (ID {restaurantId})
        </div>

        {cartLines.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">Nog leeg.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {cartLines.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-medium">{l.name}</div>

                  <div className="text-xs text-gray-500">
                    {l.price.toFixed(2)} MAD
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="rounded border px-2 py-1 text-sm hover:bg-zinc-50"
                    onClick={() => removeItem(l.id)}
                    aria-label="Remove"
                  >
                    -
                  </button>

                  <div className="min-w-6 text-center text-sm">{l.qty}</div>

                  <button
                    className="rounded border px-2 py-1 text-sm hover:bg-zinc-50"
                    onClick={() => addItem(l.id)}
                    aria-label="Add"
                  >
                    +
                  </button>
                </div>

                <div className="text-sm font-semibold">
                  {l.lineTotal.toFixed(2)} MAD
                </div>
              </div>
            ))}

            <div className="mt-4 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotaal</span>
                <span>{subTotal.toFixed(2)} MAD</span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Bezorgkosten</span>
                <span>{Number(deliveryFee).toFixed(2)} MAD</span>
              </div>

              <div className="mt-2 flex justify-between text-base font-bold">
                <span>Totaal</span>
                <span>{total.toFixed(2)} MAD</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                disabled={cartCount === 0}
                className="w-full rounded-xl bg-black px-3 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                onClick={() => {
                  const items = Object.entries(cart).map(([id, qty]) => ({
                    menu_item_id: Number(id),
                    quantity: qty,
                  }));

                  const query = new URLSearchParams({
                    restaurant_id: String(restaurantId),
                    items: JSON.stringify(items),
                  }).toString();

                  window.location.href = `/checkout?${query}`;
                }}
              >
                Doorgaan naar checkout ({cartCount})
              </button>
            </div>
          </div>
        )}
      </div>

      {categories.map((cat) => (
        <section key={cat.id}>
          <h2 className="text-xl font-semibold">{cat.name}</h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(itemsByCategory.get(cat.id) ?? []).map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-3xl border bg-white shadow-sm"
              >
                <div className="h-44 w-full overflow-hidden bg-zinc-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">
                      Geen foto
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{item.name}</div>

                      <div className="mt-2 text-sm text-gray-500">
                        {item.description || "Geen beschrijving"}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold">
                      {Number(item.price).toFixed(2)} MAD
                    </div>
                  </div>

                  <div className="mt-5">
                    <button
                      className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      onClick={() => addItem(item.id)}
                    >
                      Voeg toe
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(itemsByCategory.get(cat.id) ?? []).length === 0 && (
              <div className="text-sm text-gray-500">Geen items</div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}