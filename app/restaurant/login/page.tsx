"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function RestaurantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) return setErr(error.message);

    router.push("/restaurant/dashboard");
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Restaurant login</h1>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Wachtwoord"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err ? (
          <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Bezig..." : "Inloggen"}
        </button>
      </form>
    </div>
  );
}