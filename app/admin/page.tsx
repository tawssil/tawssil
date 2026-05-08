"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    driversPending: 0,
    driversActive: 0,
    restaurants: 0,
    orders: 0,
    newOrders: 0,
  });

  async function loadStats() {
    const [
      driversPending,
      driversActive,
      restaurants,
      orders,
      newOrders,
    ] = await Promise.all([
      supabaseBrowser.from("drivers").select("id", { count: "exact", head: true }).eq("approved", false),
      supabaseBrowser.from("drivers").select("id", { count: "exact", head: true }).eq("approved", true),
      supabaseBrowser.from("restaurants").select("id", { count: "exact", head: true }),
      supabaseBrowser.from("orders").select("id", { count: "exact", head: true }),
      supabaseBrowser.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
    ]);

    setStats({
      driversPending: driversPending.count ?? 0,
      driversActive: driversActive.count ?? 0,
      restaurants: restaurants.count ?? 0,
      orders: orders.count ?? 0,
      newOrders: newOrders.count ?? 0,
    });
  }

  useEffect(() => {
    loadStats();

    const channel = supabaseBrowser
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, loadStats)
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Beheer Tawssil: restaurants, drivers en bestellingen.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Stat title="Driver aanvragen" value={stats.driversPending} />
        <Stat title="Actieve drivers" value={stats.driversActive} />
        <Stat title="Restaurants" value={stats.restaurants} />
        <Stat title="Orders totaal" value={stats.orders} />
        <Stat title="Nieuwe orders" value={stats.newOrders} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminCard
          href="/admin/drivers"
          title="Drivers beheren"
          text="Bekijk aanvragen, keur drivers goed of blokkeer ze."
        />

        <AdminCard
          href="/admin/restaurants"
          title="Restaurants beheren"
          text="Bekijk en beheer restaurants op het platform."
        />

        <AdminCard
          href="/admin/orders"
          title="Orders bekijken"
          text="Bekijk alle bestellingen en statussen."
        />
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function AdminCard({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-xl font-semibold">{title}</div>
      <p className="mt-2 text-sm text-zinc-600">{text}</p>
      <div className="mt-5 text-sm font-medium underline underline-offset-4">
        Openen →
      </div>
    </Link>
  );
}