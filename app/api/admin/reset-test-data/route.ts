import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));

  if (body?.secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // results temizle
  const r1 = await supabase.from("results").delete().neq("id", 0);
  if (r1.error) return NextResponse.json({ error: r1.error.message }, { status: 500 });

  // leaderboard temizle
  const r2 = await supabase.from("leaderboard").delete().neq("id", 0);
  if (r2.error) return NextResponse.json({ error: r2.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
