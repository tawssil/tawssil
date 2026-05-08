"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function RestaurantLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await supabaseBrowser.auth.signOut();
      router.push("/restaurant/login");
    })();
  }, [router]);

  return (
    <div className="text-sm text-zinc-600">
      Uitloggen…
    </div>
  );
}