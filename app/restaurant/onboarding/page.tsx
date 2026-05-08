"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Restaurant = {
  id: number;
  name: string | null;
};

export default function RestaurantOnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | "">("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      if (!sessionData.session) {
        router.push("/restaurant/login");
        return;
      }

      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (!user) {
        setErr("Geen user gevonden.");
        setLoading(false);
        return;
      }

      const { data: ru } = await supabaseBrowser
        .from("restaurant_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ru?.restaurant_id) {
        router.push("/restaurant/dashboard");
        return;
      }

      const { data, error } = await supabaseBrowser
        .from("restaurants")
        .select("id, name")
        .order("name");

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as Restaurant[];
      setRestaurants(list);
      setLoading(false);
    })();
  }, [router]);

  async function claim() {
    setErr(null);

    if (restaurantId === "") {
      setErr("Kies eerst een restaurant.");
      return;
    }

    const { data: session } = await supabaseBrowser.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setErr("Niet ingelogd.");
      return;
    }

    const res = await fetch("/api/restaurant/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ restaurant_id: restaurantId }),
    });

    const j = await res.json().catch(() => null);

if (!res.ok || !j?.ok) {
  const msg =
    j?.error ??
    `Claim failed (HTTP ${res.status}) ${j ? JSON.stringify(j) : ""}`;
  setErr(msg);
  return;
}

    router.push("/restaurant/dashboard");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
        Kies je restaurant
      </h1>
      <p style={{ marginBottom: 16 }}>
        Selecteer het restaurant dat jij beheert. Daarna kun je producten en bestellingen beheren.
      </p>

      {err ? (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      ) : null}

      {loading ? (
        <div>Laden…</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value ? Number(e.target.value) : "")}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #111",
                borderRadius: 8,
                background: "#fff",
                color: "#111",
                fontSize: 16,
              }}
            >
              <option value="" style={{ color: "#111" }}>
                Selecteer restaurant…
              </option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id} style={{ color: "#111" }}>
                  {(r.name ?? "(zonder naam)")} (ID {r.id})
                </option>
              ))}
            </select>

            <button
              onClick={claim}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Doorgaan
            </button>
          </div>

          {/* ✅ HARD proof: laat restaurants ook als lijst zien */}
          <div style={{ marginTop: 16, fontSize: 14, color: "#111" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Debug: gevonden restaurants ({restaurants.length})
            </div>
            <ul style={{ paddingLeft: 18 }}>
              {restaurants.map((r) => (
                <li key={r.id}>
                  {(r.name ?? "(zonder naam)")} — ID {r.id}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}