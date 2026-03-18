import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for leaderboard API.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type SubmittedAnswer = {
  question_id: number;
  selected_option: "A" | "B" | "C" | "D" | null;
  correct_option: "A" | "B" | "C" | "D";
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const student_id = String(body.student_id || "").trim();
    const quiz_id = Number(body.quiz_id);
    const score = Number(body.score || 0);
    const answers: SubmittedAnswer[] = Array.isArray(body.answers) ? body.answers : [];

    if (!student_id || !quiz_id) {
      return NextResponse.json(
        { error: "student_id and quiz_id are required" },
        { status: 400 }
      );
    }

    // 1) Aynı öğrenci aynı quizi daha önce çözmüş mü?
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

    // 2) Daha önce çözdüyse ilk skor korunur, cevaplar tekrar yazılmaz
    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "This quiz was already submitted before. First score is protected.",
        locked: true,
        first_score: existing.score,
      });
    }

    // 3) İlk skor leaderboard'a yazılır
    const { error: insertLeaderboardError } = await supabase
      .from("leaderboard")
      .insert({
        student_id,
        quiz_id,
        score,
      });

    if (insertLeaderboardError) {
      return NextResponse.json(
        { error: insertLeaderboardError.message },
        { status: 500 }
      );
    }

    // 4) İlk denemenin cevapları kaydedilir
    if (answers.length > 0) {
      const answerRows = answers
        .filter(
          (a) =>
            Number(a?.question_id) > 0 &&
            ["A", "B", "C", "D"].includes(String(a?.correct_option || "")) &&
            (a?.selected_option === null ||
              ["A", "B", "C", "D"].includes(String(a?.selected_option || "")))
        )
        .map((a) => ({
          student_id,
          quiz_id,
          question_id: Number(a.question_id),
          selected_option: a.selected_option,
          correct_option: a.correct_option,
          is_correct:
            a.selected_option !== null && a.selected_option === a.correct_option,
        }));

      if (answerRows.length > 0) {
        const { error: insertAnswersError } = await supabase
          .from("quiz_attempt_answers")
          .insert(answerRows);

        if (insertAnswersError) {
          // rollback: leaderboard kaydı da geri alınsın
          await supabase
            .from("leaderboard")
            .delete()
            .eq("student_id", student_id)
            .eq("quiz_id", quiz_id);

          return NextResponse.json(
            { error: insertAnswersError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "First score and answers saved successfully.",
      locked: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}