"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function RestaurantSignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/restaurant/onboarding");
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Restaurant account aanmaken</h1>

      <form onSubmit={handleSignup} className="mt-6 space-y-4">
        <input
          type="email"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {errorMsg && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black px-4 py-2 text-white"
        >
          {loading ? "Bezig..." : "Account aanmaken"}
        </button>
      </form>
    </div>
  );
}