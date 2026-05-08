interface ShareBadgesProps {
  creator: {
    handle: string;
    nameEn: string;
    countryCode?: string;
  };
}

interface BadgeCardProps {
  icon: string;
  title: string;
  titleAr: string;
  borderColor: string;
  iconBg: string;
}

function BadgeCard({ icon, title, titleAr, borderColor, iconBg }: BadgeCardProps) {
  return (
    <div className="border border-[#2A263A] bg-[#19162A] p-4 text-center flex flex-col items-center gap-2">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl border"
        style={{ backgroundColor: iconBg, borderColor }}
      >
        {icon}
      </div>
      <p className="text-sm font-medium text-[#F5EFE0]">{title}</p>
      <p className="text-[10px] text-[#A7A0B8]" dir="rtl">
        {titleAr}
      </p>
    </div>
  );
}

function handleDownloadBadge() {
  // TODO: implement badge download / canvas render
  console.log("TODO: download badge");
}

function handleCopyLink(handle: string) {
  const url = `${typeof window !== "undefined" ? window.location.origin : "https://saha.gg"}/creator/${handle}`;
  if (typeof navigator !== "undefined") {
    navigator.clipboard.writeText(url).catch(() => {});
  }
}

function handleShareX(handle: string) {
  const text = encodeURIComponent(
    `Check out @${handle} on SAHA — the Arab creator intelligence platform! 🎮 #SAHA #ArabGaming`
  );
  const url = `https://twitter.com/intent/tweet?text=${text}`;
  if (typeof window !== "undefined") window.open(url, "_blank");
}

function handleShareInstagram() {
  // Instagram does not support direct URL-share API; open profile as fallback
  if (typeof window !== "undefined") window.open("https://www.instagram.com/", "_blank");
}

export function ShareBadges({ creator }: ShareBadgesProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Badges */}
      <div className="border border-[#2A263A] bg-[#0F1118] p-5">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-[#F5EFE0]">Your Badges</h2>
          <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
            شاراتك
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <BadgeCard
            icon="🏆"
            title="Top 10 Kuwait"
            titleAr="أفضل ١٠ في الكويت"
            borderColor="#F4A52C"
            iconBg="rgba(244,165,44,0.12)"
          />
          <BadgeCard
            icon="🚀"
            title="Fastest Growing"
            titleAr="الأسرع نموًا"
            borderColor="#3FB950"
            iconBg="rgba(63,185,80,0.12)"
          />
          <BadgeCard
            icon="✓"
            title="SAHA Verified"
            titleAr="موثّق من SAHA"
            borderColor="#F4A52C"
            iconBg="rgba(244,165,44,0.12)"
          />
        </div>
      </div>

      {/* Export & Share */}
      <div className="border border-[#2A263A] bg-[#0F1118] p-5">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-[#F5EFE0]">Export &amp; Share</h2>
          <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
            تصدير ومشاركة
          </p>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleDownloadBadge}
            className="w-full h-9 flex items-center justify-center gap-2 border border-[#2A263A] text-[#F5EFE0] text-sm hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors"
          >
            <span>⬇</span>
            <span>Download Badge</span>
          </button>
          <button
            onClick={() => handleCopyLink(creator.handle)}
            className="w-full h-9 flex items-center justify-center gap-2 border border-[#2A263A] text-[#F5EFE0] text-sm hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors"
          >
            <span>🔗</span>
            <span>Copy Link</span>
          </button>
          <button
            onClick={() => handleShareX(creator.handle)}
            className="w-full h-9 flex items-center justify-center gap-2 border border-[#2A263A] text-[#F5EFE0] text-sm hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors"
          >
            <span>𝕏</span>
            <span>Share on X</span>
          </button>
          <button
            onClick={handleShareInstagram}
            className="w-full h-9 flex items-center justify-center gap-2 border border-[#2A263A] text-[#F5EFE0] text-sm hover:border-[#E1306C] hover:text-[#E1306C] transition-colors"
          >
            <span>📸</span>
            <span>Share on Instagram</span>
          </button>
        </div>
      </div>
    </div>
  );
}
