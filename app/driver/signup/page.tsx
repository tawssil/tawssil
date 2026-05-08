"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DriverSignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function signup(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setErr(null);
    setMsg(null);

    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      setMsg("Account aangemaakt. Check je e-mail om te bevestigen.");
      setLoading(false);
      return;
    }

    const { error: driverErr } = await supabaseBrowser.from("drivers").insert({
      user_id: userId,
      name: name.trim(),
      phone: phone.trim(),
      is_active: false,
    });

    if (driverErr) {
      setErr(driverErr.message);
      setLoading(false);
      return;
    }

    setMsg(
      "Driver account aangemaakt. Wacht op goedkeuring van de admin voordat je kunt bezorgen."
    );

    setLoading(false);

    setTimeout(() => {
      router.push("/driver/login");
    }, 1500);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Terug naar home
      </Link>

      <div className="mt-6 rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">
          Driver account maken
        </h1>

        <p className="mt-2 text-sm text-zinc-600">
          Meld je aan als bezorger. Je account moet eerst worden goedgekeurd.
        </p>

        {err ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {msg ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {msg}
          </div>
        ) : null}

        <form onSubmit={signup} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Naam</label>
            <input
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-black"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naam bezorger"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Telefoon</label>
            <input
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-black"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06..."
            />
          </div>

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
              minLength={6}
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimaal 6 tekens"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Account maken..." : "Aanmelden als driver"}
          </button>
        </form>

        <div className="mt-5 text-sm text-zinc-600">
          Heb je al een account?{" "}
          <Link
            href="/driver/login"
            className="font-medium text-zinc-900 underline underline-offset-4"
          >
            Inloggen
          </Link>
        </div>
      </div>
    </div>
  );
}