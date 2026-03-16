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

    if (!userId) {
      return NextResponse.json(
        { error: "userId zorunlu." },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { error: classStudentsError } = await adminSupabase
      .from("class_students")
      .delete()
      .eq("student_id", userId);

    if (classStudentsError) {
      return NextResponse.json(
        { error: classStudentsError.message },
        { status: 500 }
      );
    }

    const { error: leaderboardError } = await adminSupabase
      .from("leaderboard")
      .delete()
      .eq("student_id", userId);

    if (leaderboardError) {
      return NextResponse.json(
        { error: leaderboardError.message },
        { status: 500 }
      );
    }

    const { error: profileError } = await adminSupabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(
      userId,
      false
    );

    if (deleteAuthError) {
      return NextResponse.json(
        { error: deleteAuthError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "Öğrenci silindi." },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}