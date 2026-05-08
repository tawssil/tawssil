"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // sluit menu als je buiten klikt
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link href="/" className="text-base font-semibold tracking-tight">
          Tawssil
        </Link>

        {/* Menu */}
        <div className="flex items-center gap-3 relative" ref={menuRef}>

          {/* Restaurant dropdown */}
          <button
            onClick={() => setOpen(!open)}
            className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
          >
            Voor restaurants
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-48 overflow-hidden rounded-lg border bg-white shadow-lg animate-in fade-in zoom-in">

              <Link
                href="/restaurant/login"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-zinc-100"
              >
                Inloggen
              </Link>

              <Link
                href="/restaurant/signup"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-zinc-100"
              >
                Account maken
              </Link>

            </div>
          )}

          {/* Admin knop */}
          <Link
            href="/admin/login"
            className="rounded-md bg-black px-3 py-2 text-sm text-white hover:bg-zinc-800"
          >
            Admin
          </Link>

        </div>
      </div>
    </header>
  );
}