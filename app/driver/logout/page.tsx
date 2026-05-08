"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DriverLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function logout() {
      await supabaseBrowser.auth.signOut();
      router.push("/driver/login");
      router.refresh();
    }

    logout();
  }, [router]);

  return (
    <div className="mx-auto max-w-md px-6 py-12 text-sm text-zinc-600">
      Uitloggen...
    </div>
  );
}