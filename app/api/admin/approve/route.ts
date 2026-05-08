import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface ApproveBody {
  creator_id: string;
  action?: "approve" | "reject";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile?.role as string) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as ApproveBody;
  const { creator_id, action = "approve" } = body;

  if (!creator_id) {
    return NextResponse.json({ error: "creator_id required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const newStatus = action === "approve" ? "approved" : "rejected";

  const { error } = await adminClient
    .from("creators")
    .update({ approval_status: newStatus })
    .eq("id", creator_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
