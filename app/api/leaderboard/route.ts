import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for leaderboard API.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const student_id = String(body.student_id || "").trim();
    const quiz_id = Number(body.quiz_id);
    const score = Number(body.score || 0);

    if (!student_id || !quiz_id) {
      return NextResponse.json(
        { error: "student_id and quiz_id are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("leaderboard")
      .upsert(
        {
          student_id,
          quiz_id,
          score,
        },
        { onConflict: "student_id,quiz_id" }
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Leaderboard kaydı güncellendi.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}