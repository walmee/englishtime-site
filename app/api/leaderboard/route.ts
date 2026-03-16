import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

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

    // 1) Her çözümü attempts tablosuna kaydet
    const { error: attemptsError } = await supabase.from("attempts").insert({
      user_id: student_id,
      quiz_id,
      score,
      max_score: 100,
      correct_count: null,
      duration_sec: null,
    });

    if (attemptsError) {
      console.error("attempts insert error:", attemptsError.message);
    }

    // 2) Leaderboard için mevcut kayıt var mı kontrol et
    const { data: existing, error: existingError } = await supabase
      .from("leaderboard")
      .select("id, score")
      .eq("student_id", student_id)
      .eq("quiz_id", quiz_id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    // 3) Kayıt yoksa insert, varsa sadece daha yüksekse update
    if (!existing) {
      const { error: insertError } = await supabase.from("leaderboard").insert({
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
        message: "Leaderboard kaydı oluşturuldu.",
      });
    }

    if (score > Number(existing.score || 0)) {
      const { error: updateError } = await supabase
        .from("leaderboard")
        .update({ score })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: "Leaderboard skoru güncellendi.",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Skor denemeye kaydedildi. Leaderboard değişmedi.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}