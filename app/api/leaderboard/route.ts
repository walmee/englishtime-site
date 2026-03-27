import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
};

type QuestionRow = {
  id: number;
  quiz_id: number;
  correct_option: "A" | "B" | "C" | "D";
  points: number | null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
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
    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];

    if (!quiz_id) {
      return NextResponse.json(
        { error: "quiz_id is required" },
        { status: 400 }
      );
    }

    const answers: SubmittedAnswer[] = rawAnswers
      .filter(
        (a: any) =>
          Number(a?.question_id) > 0 &&
          (a?.selected_option === null ||
            ["A", "B", "C", "D"].includes(String(a?.selected_option || "")))
      )
      .map((a: any) => ({
        question_id: Number(a.question_id),
        selected_option: a.selected_option ?? null,
      }));

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

    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .select("id, quiz_id, correct_option, points")
      .eq("quiz_id", quiz_id)
      .order("id", { ascending: true });

    if (questionError) {
      return NextResponse.json(
        { error: questionError.message },
        { status: 500 }
      );
    }

    const questions = Array.isArray(questionData) ? (questionData as QuestionRow[]) : [];

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No questions found for this quiz." },
        { status: 400 }
      );
    }

    const questionMap = new Map<number, QuestionRow>();
    questions.forEach((q) => {
      questionMap.set(Number(q.id), q);
    });

    let score = 0;

    const answerRows = answers
      .filter((a) => questionMap.has(a.question_id))
      .map((a) => {
        const question = questionMap.get(a.question_id)!;
        const isCorrect =
          a.selected_option !== null && a.selected_option === question.correct_option;

        if (isCorrect) {
          score += Number(question.points) || 0;
        }

        return {
          student_id,
          quiz_id,
          question_id: question.id,
          selected_option: a.selected_option,
          correct_option: question.correct_option,
          is_correct: isCorrect,
        };
      });

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

    return NextResponse.json({
      ok: true,
      message: "Score saved successfully.",
      locked: false,
      score,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}