import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CookieOptions = Parameters<
  ReturnType<typeof createServerClient>["auth"]["setSession"]
>[1];

export async function supabaseServerAuth() {
  const store = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return store.get(name)?.value;
        },
        // Route Handlers: cookies() is vaak read-only → no-op om errors te voorkomen
        set(_name: string, _value: string, _options: CookieOptions) {},
        remove(_name: string, _options: CookieOptions) {},
      },
    }
  );
}
