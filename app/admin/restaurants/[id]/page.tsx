import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default async function AdminRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurantId = Number(id);

  if (!Number.isFinite(restaurantId)) {
    return (
      <main className="min-h-screen p-8">
        <Link href="/admin" className="text-sm text-gray-400 hover:underline">
          ← Terug
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Ongeldig restaurant</h1>
      </main>
    );
  }

  // 1) Restaurant ophalen
  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .select("id, name, city_id, address, phone, delivery_fee, is_active")
    .eq("id", restaurantId)
    .single();

  if (restError || !restaurant) {
    return (
      <main className="min-h-screen p-8">
        <Link href="/admin" className="text-sm text-gray-400 hover:underline">
          ← Terug
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Restaurant beheer</h1>
        <pre className="mt-6 rounded bg-red-50 p-4 text-sm text-red-700">
          {JSON.stringify(restError ?? { error: "Restaurant niet gevonden" }, null, 2)}
        </pre>
      </main>
    );
  }

  // 2) Categorieën ophalen
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .order("id", { ascending: true });

  const categoryIds = (categories ?? []).map((c) => c.id);

  // 3) Menu items ophalen (alle items voor alle categorieën)
  const { data: menuItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id, category_id, name, description, price")
    .in("category_id", categoryIds.length ? categoryIds : [-1])
    .order("id", { ascending: true });

  return (
    <main className="min-h-screen p-8">
      <Link href="/admin" className="text-sm text-gray-400 hover:underline">
        ← Terug
      </Link>

      <h1 className="mt-4 text-3xl font-bold">Restaurant beheer</h1>

      {/* Restaurant info */}
      <div className="mt-6 rounded border p-4">
        <div className="text-xl font-semibold">{restaurant.name}</div>
        <div className="mt-1 text-sm text-gray-400">Stad ID: {restaurant.city_id}</div>
        <div className="mt-1 text-sm text-gray-400">
          Bezorgkosten: {Number(restaurant.delivery_fee).toFixed(2)} MAD
        </div>
        <div className="mt-1 text-sm text-gray-400">
          Actief: {restaurant.is_active ? "JA" : "NEE"}
        </div>
        {restaurant.address && (
          <div className="mt-2 text-sm text-gray-500">Adres: {restaurant.address}</div>
        )}
        {restaurant.phone && (
          <div className="mt-1 text-sm text-gray-500">Telefoon: {restaurant.phone}</div>
        )}
      </div>

      {/* Errors */}
      {(catError || itemsError) && (
        <pre className="mt-6 rounded bg-red-50 p-4 text-sm text-red-700">
          {JSON.stringify(catError ?? itemsError, null, 2)}
        </pre>
      )}

      {/* Categorie box */}
      <div className="mt-8 rounded border p-4">
        <h2 className="text-xl font-semibold">Categorieën</h2>

        {/* Categorie toevoegen */}
        <form action="/api/admin/categories" method="POST" className="mt-4 flex gap-2">
          <input type="hidden" name="restaurant_id" value={restaurantId} />
          <input
            name="name"
            placeholder="Nieuwe categorie naam"
            className="flex-1 rounded bg-zinc-800 p-2"
            required
          />
          <button type="submit" className="rounded bg-green-600 px-4 py-2">
            Toevoegen
          </button>
        </form>

        {/* Lijst categorieën + items */}
        <ul className="mt-6 space-y-3">
          {(categories ?? []).map((c) => {
            const items = (menuItems ?? []).filter((m) => m.category_id === c.id);

            return (
              <li key={c.id} className="rounded border p-3">
                <div className="font-semibold">{c.name}</div>

                {items.length === 0 ? (
                  <div className="mt-2 text-sm text-gray-500">Geen menu items.</div>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {items.map((m) => (
                      <li key={m.id} className="rounded border border-white/10 p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium">{m.name}</div>
                            {m.description ? (
                              <div className="mt-1 text-sm text-gray-500">{m.description}</div>
                            ) : null}
                          </div>
                          <div className="text-sm font-semibold">
                            {Number(m.price).toFixed(2)} MAD
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* ✅ Menu item toevoegen (hier is c wél gedefinieerd) */}
                <form
                  action="/api/admin/menu-items"
                  method="POST"
                  className="mt-3 space-y-2"
                >
                  <input type="hidden" name="category_id" value={c.id} />
                  <input type="hidden" name="restaurant_id" value={restaurantId} />

                  <input
                    name="name"
                    placeholder="Naam item"
                    className="w-full rounded bg-zinc-800 p-2"
                    required
                  />

                  <input
                    name="description"
                    placeholder="Beschrijving"
                    className="w-full rounded bg-zinc-800 p-2"
                  />

                  <input
                    name="price"
                    placeholder="Prijs (bijv 45)"
                    type="number"
                    step="0.01"
                    className="w-full rounded bg-zinc-800 p-2"
                    required
                  />

                  <button className="rounded bg-blue-600 px-3 py-2 text-sm">
                    Item toevoegen
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
