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

    // 1) Önce aynı öğrenci aynı quizi daha önce çözmüş mü kontrol et
    const { data: existing, error: existingError } = await supabase
      .from("leaderboard")
      .select("student_id, quiz_id, score")
      .eq("student_id", student_id)
      .eq("quiz_id", quiz_id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    // 2) Kayıt varsa değiştirme
    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "This quiz was already submitted before. First score is protected.",
        locked: true,
        first_score: existing.score,
      });
    }

    // 3) İlk kez çözülüyorsa kaydet
    const { error: insertError } = await supabase
      .from("leaderboard")
      .insert({
        student_id,
        quiz_id,
        score,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "First score saved to leaderboard.",
      locked: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}