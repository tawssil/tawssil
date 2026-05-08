"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Category = { id: number; name: string; restaurant_id: number };
type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category_id: number | null;
  restaurant_id: number;
  image_url: string | null;
};

export default function RestaurantMenuPage() {
  const router = useRouter();

  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [imageUrl, setImageUrl] = useState<string>("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const parsedPrice = useMemo(() => {
    const n = Number(String(price).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }, [price]);

  async function requireSession() {
    const { data: session } = await supabaseBrowser.auth.getSession();
    if (!session.session) {
      router.push("/restaurant/login");
      return null;
    }
    return session.session;
  }

  async function loadRestaurantId() {
    const { data: ru, error: ruErr } = await supabaseBrowser
      .from("restaurant_users")
      .select("restaurant_id")
      .maybeSingle();

    if (ruErr || !ru?.restaurant_id) {
      throw new Error("Je account is niet gekoppeld aan een restaurant.");
    }

    return Number(ru.restaurant_id);
  }

  async function loadAll() {
    setErr(null);
    setLoading(true);

    const session = await requireSession();
    if (!session) return;

    try {
      const rid = await loadRestaurantId();
      setRestaurantId(rid);

      const { data: catData, error: catErr } = await supabaseBrowser
        .from("categories")
        .select("id, name, restaurant_id")
        .eq("restaurant_id", rid)
        .order("name", { ascending: true });

      if (catErr) throw new Error(catErr.message);
      setCategories((catData as any) ?? []);

      const { data: itemData, error: itemErr } = await supabaseBrowser
        .from("menu_items")
        .select("id, name, description, price, category_id, restaurant_id, image_url")
        .eq("restaurant_id", rid)
        .order("id", { ascending: false });

      if (itemErr) throw new Error(itemErr.message);
      setItems((itemData as any) ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function resetProductForm() {
    setName("");
    setDescription("");
    setPrice("");
    setCategoryId("");
    setImageUrl("");
    setEditingId(null);
  }

  async function createCategory() {
    setErr(null);
    if (!restaurantId) return setErr("RestaurantId ontbreekt.");
    const nm = newCategoryName.trim();
    if (!nm) return setErr("Categorie naam is verplicht.");

    const { error } = await supabaseBrowser.from("categories").insert({
      name: nm,
      restaurant_id: restaurantId,
    });

    if (error) return setErr(error.message);

    setNewCategoryName("");
    await loadAll();
  }

  async function deleteCategory(id: number) {
    setErr(null);
    const ok = confirm("Categorie verwijderen?");
    if (!ok) return;

    const used = items.some((it) => it.category_id === id);
    if (used) {
      setErr("Deze categorie wordt nog gebruikt door producten.");
      return;
    }

    const { error } = await supabaseBrowser.from("categories").delete().eq("id", id);
    if (error) return setErr(error.message);

    await loadAll();
  }

  async function handleImageUpload(file: File) {
    if (!restaurantId) return;
    setUploadingImage(true);
    setErr(null);

    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `restaurant-${restaurantId}/menu-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabaseBrowser.storage
        .from("menu-images")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabaseBrowser.storage
        .from("menu-images")
        .getPublicUrl(filePath);

      setImageUrl(data.publicUrl);
    } catch (e: any) {
      setErr(e?.message ?? "Afbeelding upload mislukt");
    } finally {
      setUploadingImage(false);
    }
  }

  async function createItem() {
    setErr(null);
    if (!restaurantId) return setErr("RestaurantId ontbreekt.");
    if (!name.trim()) return setErr("Naam is verplicht.");
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return setErr("Prijs is ongeldig.");

    const { error } = await supabaseBrowser.from("menu_items").insert({
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      price: parsedPrice,
      category_id: categoryId === "" ? null : categoryId,
      restaurant_id: restaurantId,
      image_url: imageUrl || null,
    });

    if (error) return setErr(error.message);

    resetProductForm();
    await loadAll();
  }

  function startEdit(it: MenuItem) {
    setEditingId(it.id);
    setName(it.name ?? "");
    setDescription(it.description ?? "");
    setPrice(String(it.price ?? ""));
    setCategoryId(it.category_id ?? "");
    setImageUrl(it.image_url ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEdit() {
    setErr(null);
    if (!editingId) return;
    if (!name.trim()) return setErr("Naam is verplicht.");
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return setErr("Prijs is ongeldig.");

    const { error } = await supabaseBrowser
      .from("menu_items")
      .update({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        price: parsedPrice,
        category_id: categoryId === "" ? null : categoryId,
        image_url: imageUrl || null,
      })
      .eq("id", editingId);

    if (error) return setErr(error.message);

    resetProductForm();
    await loadAll();
  }

  async function removeItem(id: number) {
    setErr(null);
    const ok = confirm("Product verwijderen?");
    if (!ok) return;

    const { error } = await supabaseBrowser.from("menu_items").delete().eq("id", id);
    if (error) return setErr(error.message);

    await loadAll();
  }

  function categoryNameById(id: number | null) {
    if (!id) return "Geen categorie";
    return categories.find((c) => c.id === id)?.name ?? `Categorie #${id}`;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Producten</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Je beheert hier je eigen categorieën en producten.
        </p>

        {err ? (
          <div className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="font-semibold">Categorieën</div>
            <div className="mt-2 flex gap-2">
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Nieuwe categorie"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button
                onClick={createCategory}
                className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
              >
                Toevoegen
              </button>
            </div>

            <div className="mt-3">
              {loading ? (
                <div className="text-sm text-zinc-600">Laden…</div>
              ) : categories.length === 0 ? (
                <div className="text-sm text-zinc-600">Nog geen categorieën.</div>
              ) : (
                <div className="divide-y rounded border">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="text-sm">{c.name}</div>
                      <button
                        className="rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                        onClick={() => deleteCategory(c.id)}
                      >
                        Verwijderen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="font-semibold">{editingId ? "Product bewerken" : "Nieuw product"}</div>

            <div className="mt-3 grid gap-3">
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Naam"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Prijs"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />

              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Beschrijving"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <select
                className="w-full rounded border px-3 py-2"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">Geen categorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="space-y-2">
                <label className="cursor-pointer rounded-md border px-4 py-2 text-sm hover:bg-zinc-50 inline-block">
                  {uploadingImage ? "Uploaden..." : "Productfoto uploaden"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </label>

                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-28 w-28 rounded-lg border object-cover"
                  />
                ) : null}
              </div>

              <div className="flex gap-2">
                {editingId ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
                    >
                      Opslaan
                    </button>
                    <button
                      onClick={resetProductForm}
                      className="rounded border px-4 py-2 hover:bg-zinc-50"
                    >
                      Annuleren
                    </button>
                  </>
                ) : (
                  <button
                    onClick={createItem}
                    className="rounded bg-black px-4 py-2 text-white hover:bg-zinc-800"
                  >
                    Product toevoegen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Jouw producten</h2>
          <button className="rounded border px-3 py-2 text-sm hover:bg-zinc-50" onClick={loadAll}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-zinc-600">Laden…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-zinc-600">Nog geen producten.</div>
        ) : (
          <div className="divide-y">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt={it.name}
                      className="h-16 w-16 rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-zinc-100 text-xs text-zinc-500">
                      Geen foto
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="font-medium">
                      {it.name}{" "}
                      <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                        {categoryNameById(it.category_id)}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-600">
                      {it.description ?? "—"} • {Number(it.price).toFixed(2)} MAD
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded border px-3 py-2 text-sm hover:bg-zinc-50"
                    onClick={() => startEdit(it)}
                  >
                    Bewerken
                  </button>
                  <button
                    className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    onClick={() => removeItem(it.id)}
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}