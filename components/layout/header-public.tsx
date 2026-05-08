import Link from "next/link";

export function HeaderPublic() {
  return (
    <header className="border-b border-[#2A263A] bg-[#0B0A12]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-lg text-[#F5EFE0] hover:text-[#F4A52C] transition-colors tracking-tight"
        >
          SAHA
          <span className="text-[#F4A52C]">.</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/discover"
            className="text-sm text-[#A7A0B8] hover:text-[#F5EFE0] transition-colors tracking-wide"
          >
            Discover
          </Link>
          <Link
            href="/discover?sort=rank"
            className="text-sm text-[#A7A0B8] hover:text-[#F5EFE0] transition-colors tracking-wide"
          >
            Rankings
          </Link>
        </nav>

        {/* CTA */}
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-8 px-4 border border-[#2A263A] text-[#F5EFE0] text-xs tracking-wide hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors"
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}
