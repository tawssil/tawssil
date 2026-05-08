"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DriverLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setErr(null);

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    router.push("/driver/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Terug naar home
      </Link>

      <div className="mt-6 rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">Driver login</h1>

        <p className="mt-2 text-sm text-zinc-600">
          Log in om beschikbare bezorgingen te bekijken.
        </p>

        {err ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <form onSubmit={login} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <input
              type="email"
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="driver@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Wachtwoord</label>
            <input
              type="password"
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Inloggen..." : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}