import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing env values." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const userId = String(body.userId || "").trim();
    const isActive = Boolean(body.isActive);

    if (!userId) {
      return NextResponse.json(
        { error: "userId zorunlu." },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { error: profileError } = await adminSupabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        ban_duration: isActive ? "none" : "876000h",
      }
    );

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: isActive
          ? "Öğrenci yeniden aktif edildi."
          : "Öğrenci pasif yapıldı.",
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}