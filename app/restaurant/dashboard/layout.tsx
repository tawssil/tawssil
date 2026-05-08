import Link from "next/link";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
    >
      {label}
    </Link>
  );
}

export default function RestaurantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Tawssil
            </Link>
            <span className="text-xs text-zinc-400">/</span>
            <span className="text-sm text-zinc-600">Restaurant Dashboard</span>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink href="/restaurant/dashboard" label="Overzicht" />
            <NavLink href="/restaurant/dashboard/menu" label="Producten" />
            <NavLink href="/restaurant/dashboard/orders" label="Bestellingen" />
            <NavLink href="/restaurant/dashboard/kitchen" label="Kitchen" />
            <NavLink href="/restaurant/dashboard/settings" label="Instellingen" />

            <Link
              href="/restaurant/logout"
              className="ml-2 rounded-md border bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Uitloggen
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

      <footer className="mt-10 border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-zinc-500">
          © {new Date().getFullYear()} Tawssil — Restaurant Portal
        </div>
      </footer>
    </div>
  );
}