import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

type HistoryRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  created_at?: string | null;
};

type QuizMeta = {
  id: number;
  title: string;
  unit: string | null;
};

type AttemptAnswerRow = {
  quiz_id: number;
  question_id: number;
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
};

type QuestionMeta = {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

export async function GET(req: Request) {
  try {
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

    const studentId = user.id;

    const { data: historyData, error: historyError } = await adminSupabase
      .from("leaderboard")
      .select("student_id, quiz_id, score, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    const rows = Array.isArray(historyData) ? (historyData as HistoryRow[]) : [];
    const quizIds = [...new Set(rows.map((r) => Number(r.quiz_id)).filter(Boolean))];

    let quizzes: QuizMeta[] = [];
    let attemptAnswers: AttemptAnswerRow[] = [];
    let questions: QuestionMeta[] = [];

    if (quizIds.length > 0) {
      const { data: quizData, error: quizError } = await adminSupabase
        .from("quizzes")
        .select("id, title, unit")
        .in("id", quizIds);

      if (quizError) {
        return NextResponse.json({ error: quizError.message }, { status: 500 });
      }

      quizzes = Array.isArray(quizData) ? (quizData as QuizMeta[]) : [];

      const { data: answersData, error: answersError } = await adminSupabase
        .from("quiz_attempt_answers")
        .select("quiz_id, question_id, selected_option, correct_option, is_correct")
        .eq("student_id", studentId)
        .in("quiz_id", quizIds);

      if (answersError) {
        return NextResponse.json({ error: answersError.message }, { status: 500 });
      }

      attemptAnswers = Array.isArray(answersData) ? (answersData as AttemptAnswerRow[]) : [];

      const questionIds = [
        ...new Set(attemptAnswers.map((a) => Number(a.question_id)).filter(Boolean)),
      ];

      if (questionIds.length > 0) {
        const { data: questionData, error: questionError } = await adminSupabase
          .from("questions")
          .select("id, question_text, option_a, option_b, option_c, option_d")
          .in("id", questionIds);

        if (questionError) {
          return NextResponse.json({ error: questionError.message }, { status: 500 });
        }

        questions = Array.isArray(questionData) ? (questionData as QuestionMeta[]) : [];
      }
    }

    return NextResponse.json({
      history: rows,
      quizzes,
      attemptAnswers,
      questions,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}