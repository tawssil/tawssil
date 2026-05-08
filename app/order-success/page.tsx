"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="p-10">Laden...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}

function OrderSuccessContent() {
  const params = useSearchParams();

  const orderId = params.get("id");
  const paymentMethod = params.get("payment_method");

  const isCash = paymentMethod === "cash";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✅
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Bestelling ontvangen
        </h1>

        <p className="mt-3 text-zinc-600">
          {isCash
            ? "Je bestelling is geplaatst. Je betaalt contant bij levering."
            : "Je bestelling is succesvol geplaatst en wordt nu verwerkt door het restaurant."}
        </p>

        <div className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
          <div className="font-medium">Bestelgegevens</div>

          <div className="mt-2">
            Ordernummer:{" "}
            <span className="font-semibold">
              #{orderId ?? "onbekend"}
            </span>
          </div>

          <div className="mt-1">
            Betaalmethode:{" "}
            <span className="font-semibold">
              {isCash ? "Contant bij levering" : "Online"}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            Terug naar home
          </Link>

          {orderId ? (
            <Link
              href={`/order/${orderId}`}
              className="rounded-md border px-4 py-2 text-sm hover:bg-zinc-50"
            >
              Bekijk bestelling
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}