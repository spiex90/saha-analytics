import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { AdminApprovals } from "./admin-approvals";
import { AdminSpotlight } from "./admin-spotlight";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />

      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        {/* Top bar */}
        <div className="h-14 border-b border-[#2A263A] px-6 flex items-center justify-between">
          <h1 className="font-serif text-lg text-[#F5EFE0]">Admin</h1>
          <span className="text-xs text-[#A7A0B8] border border-[#2A263A] px-2 py-0.5">
            admin
          </span>
        </div>

        <div className="px-6 py-6 space-y-10">
          <AdminApprovals />
          <AdminSpotlight />
        </div>
      </div>
    </div>
  );
}
