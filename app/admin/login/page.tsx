"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowserAuth } from "@/lib/supabaseBrowserAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { error } = await supabaseBrowserAuth.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    router.push("/admin/orders");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md p-6 text-white">
      <h1 className="text-3xl font-bold">Admin login</h1>
      <p className="mt-2 text-white/70">
        Log in om orders realtime te beheren.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          className="w-full rounded bg-zinc-900 p-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <input
          className="w-full rounded bg-zinc-900 p-3"
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        <button
          className="w-full rounded bg-green-600 py-3 font-semibold disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Bezig..." : "Inloggen"}
        </button>

        {err && (
          <div className="rounded border border-red-700 bg-red-900/40 p-3 text-sm">
            {err}
          </div>
        )}
      </form>
    </main>
  );
}
