export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DayHours = {
  is_open: boolean;
  open: string;
  close: string;
};

export type OpeningHours = Partial<Record<DayKey, DayHours>>;

const DAY_KEYS: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function defaultOpeningHours(): OpeningHours {
  return {
    monday: { is_open: true, open: "10:00", close: "22:00" },
    tuesday: { is_open: true, open: "10:00", close: "22:00" },
    wednesday: { is_open: true, open: "10:00", close: "22:00" },
    thursday: { is_open: true, open: "10:00", close: "22:00" },
    friday: { is_open: true, open: "10:00", close: "23:00" },
    saturday: { is_open: true, open: "10:00", close: "23:00" },
    sunday: { is_open: true, open: "10:00", close: "22:00" },
  };
}

export function normalizeOpeningHours(value: unknown): OpeningHours {
  if (!value || typeof value !== "object") {
    return defaultOpeningHours();
  }

  const base = defaultOpeningHours();
  const input = value as Record<string, any>;

  for (const day of Object.keys(base) as DayKey[]) {
    const v = input[day];
    if (!v || typeof v !== "object") continue;

    base[day] = {
      is_open: Boolean(v.is_open),
      open: typeof v.open === "string" ? v.open : base[day]!.open,
      close: typeof v.close === "string" ? v.close : base[day]!.close,
    };
  }

  return base;
}

function toMinutes(hhmm: string): number {
  const [h, m] = String(hhmm || "")
    .split(":")
    .map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function prevDay(day: DayKey): DayKey {
  const idx = DAY_KEYS.indexOf(day);
  return DAY_KEYS[(idx - 1 + DAY_KEYS.length) % DAY_KEYS.length];
}

export function dayLabel(day: DayKey): string {
  const map: Record<DayKey, string> = {
    monday: "Maandag",
    tuesday: "Dinsdag",
    wednesday: "Woensdag",
    thursday: "Donderdag",
    friday: "Vrijdag",
    saturday: "Zaterdag",
    sunday: "Zondag",
  };
  return map[day];
}

export function getOpenState(
  openingHours: unknown,
  now = new Date()
): {
  isOpen: boolean;
  label: string;
  todayKey: DayKey;
  todayHours: DayHours | null;
} {
  const hours = normalizeOpeningHours(openingHours);
  const todayKey = DAY_KEYS[now.getDay()];
  const todayHours = hours[todayKey] ?? null;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1) Eerst check: valt huidige tijd nog in de "overnight" opening van gisteren?
  const yesterdayKey = prevDay(todayKey);
  const yesterdayHours = hours[yesterdayKey] ?? null;

  if (yesterdayHours?.is_open) {
    const yOpen = toMinutes(yesterdayHours.open);
    const yClose = toMinutes(yesterdayHours.close);

    // overnight als sluit <= open, bv 10:00 -> 00:00 of 10:00 -> 03:00
    const yesterdayIsOvernight = yClose <= yOpen;

    if (yesterdayIsOvernight && currentMinutes < yClose) {
      return {
        isOpen: true,
        label: `Open tot ${yesterdayHours.close}`,
        todayKey,
        todayHours,
      };
    }
  }

  // 2) Vandaag gesloten
  if (!todayHours || !todayHours.is_open) {
    return {
      isOpen: false,
      label: "Gesloten vandaag",
      todayKey,
      todayHours,
    };
  }

  const openMinutes = toMinutes(todayHours.open);
  const closeMinutes = toMinutes(todayHours.close);
  const isOvernight = closeMinutes <= openMinutes;

  // 3) Normale opening dezelfde dag
  if (!isOvernight) {
    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

    if (isOpen) {
      return {
        isOpen: true,
        label: `Open tot ${todayHours.close}`,
        todayKey,
        todayHours,
      };
    }

    if (currentMinutes < openMinutes) {
      return {
        isOpen: false,
        label: `Opent om ${todayHours.open}`,
        todayKey,
        todayHours,
      };
    }

    return {
      isOpen: false,
      label: "Gesloten • Morgen weer open",
      todayKey,
      todayHours,
    };
  }

  // 4) Overnight opening vandaag, bv 10:00 -> 03:00
  // Open als:
  // - huidige tijd >= openMinutes (zelfde avond)
  // OF
  // - huidige tijd < closeMinutes (na middernacht, maar dat deel wordt meestal al door gisteren afgehandeld)
  const isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;

  if (isOpen) {
    return {
      isOpen: true,
      label: `Open tot ${todayHours.close}`,
      todayKey,
      todayHours,
    };
  }

  return {
    isOpen: false,
    label: `Opent om ${todayHours.open}`,
    todayKey,
    todayHours,
  };
}