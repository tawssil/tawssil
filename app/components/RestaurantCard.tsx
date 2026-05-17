import Link from "next/link";

type RestaurantCardProps = {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  rating?: number | null;
  etaMin?: number | null;
  deliveryFee?: number | null;
  isOpen?: boolean;
};

export default function RestaurantCard({
  id,
  name,
  address,
  city,
  logoUrl,
  coverUrl,
  rating,
  etaMin,
  deliveryFee,
  isOpen = true,
}: RestaurantCardProps) {
  return (
    <Link
      href={`/r/${id}`}
      className="group block overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-44 overflow-hidden bg-zinc-100">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-emerald-100 text-sm text-zinc-500">
            Geen coverfoto
          </div>
        )}

        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          ⭐ {Number(rating ?? 4.5).toFixed(1)}
        </div>

        <div
          className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur ${
            isOpen
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {isOpen ? "Open" : "Gesloten"}
        </div>
      </div>

      <div className="relative p-5 pt-9">
        <div className="absolute -top-8 left-5 h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-xs text-zinc-500">
              Logo
            </div>
          )}
        </div>

        <h3 className="truncate text-lg font-black tracking-tight text-zinc-950">
          {name}
        </h3>

        <p className="mt-1 truncate text-sm text-zinc-500">
          {address ?? city ?? "Marokko"}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-zinc-700">
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            🚚 {etaMin ?? 30} min
          </span>

          <span className="rounded-full bg-zinc-100 px-3 py-1">
            {Number(deliveryFee ?? 0).toFixed(2)} MAD
          </span>

          <span className="rounded-full bg-zinc-100 px-3 py-1">
            Bekijk menu →
          </span>
        </div>
      </div>
    </Link>
  );
}