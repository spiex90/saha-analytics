"use client";

import { useState } from "react";
import { Download, Link2, X, Camera, Check, Lock } from "lucide-react";
import Image from "next/image";

interface ShareBadgesProps {
  creator: {
    handle: string;
    nameEn: string;
    countryCode?: string;
  };
}

const BADGES = [
  {
    id: "founding",
    label: "Founding Creator",
    labelAr: "منشئ مؤسس",
    src: "/badges/founding-creator.png",
    earned: true,
  },
  {
    id: "verified",
    label: "SAHA Verified",
    labelAr: "موثق من SAHA",
    src: "/badges/saha-verified.png",
    earned: true,
  },
  {
    id: "top10",
    label: "Top 10 Kuwait",
    labelAr: "أفضل 10 في الكويت",
    src: "/badges/top-10-kuwait.png",
    earned: true,
  },
  {
    id: "fastest",
    label: "Fastest Growing",
    labelAr: "الأسرع نمواً",
    src: null,
    earned: false,
  },
  {
    id: "rising",
    label: "Rising Creator",
    labelAr: "منشئ صاعد",
    src: null,
    earned: false,
  },
  {
    id: "elite",
    label: "SAHA Elite",
    labelAr: "النخبة",
    src: null,
    earned: false,
  },
] as const;

type BadgeId = (typeof BADGES)[number]["id"];

function handleShareX(handle: string, label: string) {
  const text = encodeURIComponent(
    `I just earned the "${label}" badge on SAHA — the Arab creator intelligence platform 🎮\nsaha.gg/creator/${handle}\n#SAHA #ArabGaming`
  );
  if (typeof window !== "undefined")
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
}

function handleShareInstagram() {
  if (typeof window !== "undefined")
    window.open("https://www.instagram.com/", "_blank");
}

export function ShareBadges({ creator }: ShareBadgesProps) {
  const [selected, setSelected] = useState<BadgeId>("founding");
  const [copied, setCopied] = useState(false);

  const selectedBadge = BADGES.find((b) => b.id === selected) ?? BADGES[0];

  function handleCopyLink() {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://saha.gg"}/creator/${creator.handle}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!selectedBadge.src) return;
    const link = document.createElement("a");
    link.href = selectedBadge.src;
    link.download = `saha-badge-${selectedBadge.id}.png`;
    link.click();
  }

  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="text-sm font-medium text-[#F5EFE0]">Share Badge</h2>
          <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
            شارك إنجازاتك مع جمهورك
          </p>
        </div>
        <span className="text-[10px] text-[#4A4560] uppercase tracking-widest">
          {BADGES.filter((b) => b.earned).length} / {BADGES.length} earned
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_200px] gap-6 items-start">

        {/* Left: Badge grid */}
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map((badge) => {
            const isSelected = selected === badge.id;
            return (
              <button
                key={badge.id}
                onClick={() => badge.earned && setSelected(badge.id)}
                disabled={!badge.earned}
                title={badge.earned ? badge.label : `${badge.label} — not yet earned`}
                className={[
                  "relative flex flex-col items-center gap-1.5 p-2 border transition-all",
                  isSelected
                    ? "border-[#F4A52C]/50 bg-[#19162A]"
                    : badge.earned
                    ? "border-[#2A263A] hover:border-[#F4A52C]/30 bg-transparent"
                    : "border-[#2A263A]/40 bg-transparent opacity-35 cursor-not-allowed",
                ].join(" ")}
              >
                {badge.src ? (
                  <Image
                    src={badge.src}
                    alt={badge.label}
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 flex flex-col items-center justify-center gap-1 border border-[#2A263A]">
                    <Lock className="w-4 h-4 text-[#4A4560]" />
                    <span className="text-[8px] text-[#4A4560] uppercase tracking-widest">Locked</span>
                  </div>
                )}
                <span
                  className={[
                    "text-[9px] uppercase tracking-widest leading-tight text-center",
                    isSelected ? "text-[#F4A52C]" : "text-[#4A4560]",
                  ].join(" ")}
                >
                  {badge.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Centre: selected badge preview */}
        <div className="flex flex-col items-center gap-3">
          {selectedBadge.src ? (
            <div className="border border-[#F4A52C]/20 bg-[#0B0A12] p-3">
              <Image
                src={selectedBadge.src}
                alt={selectedBadge.label}
                width={160}
                height={160}
                className="object-contain"
              />
            </div>
          ) : (
            <div className="border border-[#2A263A] bg-[#0B0A12] p-3 w-[184px] h-[184px] flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#2A263A]" />
            </div>
          )}
          <p className="text-[10px] text-[#4A4560] uppercase tracking-widest">Preview</p>
        </div>

        {/* Right: Export */}
        <div className="flex flex-col gap-1 self-start">
          <div className="mb-3">
            <h3 className="text-xs font-medium text-[#F5EFE0]">Export &amp; Share</h3>
            <p className="text-[10px] text-[#A7A0B8] mt-0.5" dir="rtl">تصدير ومشاركة</p>
          </div>

          <button
            onClick={handleDownload}
            disabled={!selectedBadge.src}
            className="flex items-center gap-3 border border-[#2A263A] text-[#F5EFE0] px-3 py-2.5 text-xs hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors w-full disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            Download Badge
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 border border-[#2A263A] text-[#F5EFE0] px-3 py-2.5 text-xs hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors w-full"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-[#3FB950]" />
            ) : (
              <Link2 className="w-3.5 h-3.5 shrink-0" />
            )}
            {copied ? "Copied!" : "Copy Link"}
          </button>

          <button
            onClick={() => handleShareX(creator.handle, selectedBadge.label)}
            className="flex items-center gap-3 border border-[#2A263A] text-[#F5EFE0] px-3 py-2.5 text-xs hover:border-[#F5EFE0] hover:text-[#F5EFE0] transition-colors w-full"
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            Share on X
          </button>

          <button
            onClick={handleShareInstagram}
            className="flex items-center gap-3 border border-[#2A263A] text-[#F5EFE0] px-3 py-2.5 text-xs hover:border-[#E1306C] hover:text-[#E1306C] transition-colors w-full"
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            Share on Instagram
          </button>

          <div className="mt-3 pt-3 border-t border-[#2A263A]">
            <p className="text-[10px] text-[#4A4560] uppercase tracking-widest mb-1">Selected</p>
            <p className="text-xs text-[#F5EFE0]">{selectedBadge.label}</p>
            <p className="text-[10px] text-[#A7A0B8] mt-0.5" dir="rtl">{selectedBadge.labelAr}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
