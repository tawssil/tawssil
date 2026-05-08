"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  DayKey,
  OpeningHours,
  dayLabel,
  defaultOpeningHours,
  normalizeOpeningHours,
} from "@/lib/openingHours";

const DAYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function RestaurantSettingsPage() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours());
  const [timezone, setTimezone] = useState("Africa/Casablanca");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    const {
      data: { user },
      error: userErr,
    } = await supabaseBrowser.auth.getUser();

    if (userErr || !user) {
      setErr(userErr?.message ?? "Niet ingelogd.");
      setLoading(false);
      return;
    }

    const { data: ru, error: ruErr } = await supabaseBrowser
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ruErr || !ru?.restaurant_id) {
      setErr(ruErr?.message ?? "Geen restaurant gekoppeld.");
      setLoading(false);
      return;
    }

    const rid = Number(ru.restaurant_id);
    setRestaurantId(rid);

    const { data: restaurant, error: restErr } = await supabaseBrowser
      .from("restaurants")
      .select("opening_hours, timezone")
      .eq("id", rid)
      .maybeSingle();

    if (restErr) {
      setErr(restErr.message);
      setLoading(false);
      return;
    }

    setOpeningHours(normalizeOpeningHours(restaurant?.opening_hours));
    setTimezone(String(restaurant?.timezone ?? "Africa/Casablanca"));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateDay(day: DayKey, patch: Partial<{ is_open: boolean; open: string; close: string }>) {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        is_open: prev[day]?.is_open ?? true,
        open: prev[day]?.open ?? "10:00",
        close: prev[day]?.close ?? "22:00",
        ...patch,
      },
    }));
  }

  async function save() {
    if (!restaurantId) return;
    setSaving(true);
    setErr(null);
    setMsg(null);

    const { error } = await supabaseBrowser
      .from("restaurants")
      .update({
        opening_hours: openingHours,
        timezone,
      })
      .eq("id", restaurantId);

    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }

    setMsg("Openingstijden opgeslagen.");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-zinc-600">
        Laden…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Instellingen</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Stel je openingstijden in. Klanten zien automatisch of je open of gesloten bent.
        </p>

        {err ? (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</div>
        ) : null}

        {msg ? (
          <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>
        ) : null}

        <div className="mt-6 rounded-xl border p-4">
          <label className="text-sm font-medium">Tijdzone</label>
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-6 space-y-4">
          {DAYS.map((day) => {
            const v = openingHours[day] ?? {
              is_open: true,
              open: "10:00",
              close: "22:00",
            };

            return (
              <div key={day} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-40 text-sm font-semibold">{dayLabel(day)}</div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={v.is_open}
                      onChange={(e) => updateDay(day, { is_open: e.target.checked })}
                    />
                    Open
                  </label>

                  <input
                    type="time"
                    value={v.open}
                    disabled={!v.is_open}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  />

                  <span className="text-sm text-zinc-500">tot</span>

                  <input
                    type="time"
                    value={v.close}
                    disabled={!v.is_open}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}