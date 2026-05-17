"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = Number(params.id);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitReview() {
    if (loading) return;

    if (!name.trim()) {
      alert("Naam verplicht");
      return;
    }

    if (!review.trim()) {
      alert("Review verplicht");
      return;
    }

    setLoading(true);

    try {
      const { data: order } = await supabaseBrowser
        .from("orders")
        .select("restaurant_id")
        .eq("id", orderId)
        .single();

      if (!order) {
        alert("Order niet gevonden");
        return;
      }

      const { error } = await supabaseBrowser
        .from("reviews")
        .insert({
          order_id: orderId,
          restaurant_id: order.restaurant_id,
          customer_name: name,
          rating,
          review,
        });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Review geplaatst!");

      router.push(`/r/${order.restaurant_id}`);
    } catch (e: any) {
      alert(e.message ?? "Fout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-3xl font-bold">
        Schrijf een review
      </h1>

      <div className="mt-6 space-y-4 rounded-3xl border bg-white p-6 shadow-sm">
        <input
          placeholder="Jouw naam"
          className="w-full rounded-xl border px-4 py-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <div className="mb-2 text-sm font-medium">
            Rating
          </div>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`text-3xl transition ${
                  n <= rating
                    ? "opacity-100"
                    : "opacity-30"
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>

        <textarea
          placeholder="Hoe was je bestelling?"
          className="min-h-[140px] w-full rounded-xl border px-4 py-3"
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />

        <button
          onClick={submitReview}
          disabled={loading}
          className="w-full rounded-2xl bg-black px-5 py-4 font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Versturen..." : "Review plaatsen"}
        </button>
      </div>
    </div>
  );
}