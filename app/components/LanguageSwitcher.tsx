"use client";

import { Language } from "@/lib/translations";

const languages: { code: Language; label: string }[] = [
  { code: "nl", label: "NL" },
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
];

export default function LanguageSwitcher({
  value,
  onChange,
}: {
  value: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <div className="flex rounded-xl border bg-white/80 p-1 shadow-sm">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            value === lang.code
              ? "bg-black text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}