"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0B0A12] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="font-serif text-2xl text-[#F5EFE0] hover:text-[#F4A52C] transition-colors"
          >
            SAHA<span className="text-[#F4A52C]">.</span>
          </Link>
        </div>

        <div className="border border-[#2A263A] bg-[#0F1118] p-8">
          <h1 className="font-serif text-xl text-[#F5EFE0] mb-1">
            Sign in
          </h1>
          <p className="text-xs text-[#A7A0B8] mb-6 uppercase tracking-widest">
            Arab Creator Intelligence
          </p>

          {error && (
            <div className="border border-[#FF3B3B]/40 bg-[#FF3B3B]/5 px-3 py-2 text-xs text-[#FF3B3B] mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#A7A0B8] uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-10 px-3 bg-[#19162A] border border-[#2A263A] text-sm text-[#F5EFE0] placeholder:text-[#A7A0B8]/50 focus:outline-none focus:border-[#F4A52C] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs text-[#A7A0B8] uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-10 px-3 bg-[#19162A] border border-[#2A263A] text-sm text-[#F5EFE0] placeholder:text-[#A7A0B8]/50 focus:outline-none focus:border-[#F4A52C] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#F4A52C] text-[#0B0A12] text-sm font-semibold tracking-wide hover:bg-[#e8971f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#A7A0B8] mt-4">
          No account?{" "}
          <Link
            href="/signup"
            className="text-[#F4A52C] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
