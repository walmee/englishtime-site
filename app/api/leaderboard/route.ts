import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
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

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student_id = user.id;
    const quiz_id = Number(body.quiz_id);
    const score = Number(body.score || 0);
    const answers: SubmittedAnswer[] = Array.isArray(body.answers) ? body.answers : [];

    if (!quiz_id) {
      return NextResponse.json(
        { error: "quiz_id is required" },
        { status: 400 }
      );
    }

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

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "This quiz was already submitted before. First score is protected.",
        locked: true,
        first_score: existing.score,
      });
    }

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