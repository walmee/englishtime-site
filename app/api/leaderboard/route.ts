import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase environment variables for leaderboard API.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type IncomingAnswer = {
  question_id: number;
  selected_option: "A" | "B" | "C" | "D" | null;
};

type QuestionRow = {
  id: number;
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
    const answers: IncomingAnswer[] = Array.isArray(body.answers) ? body.answers : [];

    if (!quiz_id) {
      return NextResponse.json({ error: "quiz_id is required" }, { status: 400 });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, correct_option, points")
      .eq("quiz_id", quiz_id)
      .order("id", { ascending: true });

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    const questionRows = Array.isArray(questions) ? (questions as QuestionRow[]) : [];

    if (questionRows.length === 0) {
      return NextResponse.json(
        { error: "No questions found for this quiz." },
        { status: 404 }
      );
    }

    const questionMap = new Map<number, QuestionRow>();
    questionRows.forEach((q) => {
      questionMap.set(Number(q.id), q);
    });

    let score = 0;

    const resultAnswers = answers
      .map((a) => {
        const questionId = Number(a?.question_id);
        const selected =
          a?.selected_option === null ||
          a?.selected_option === "A" ||
          a?.selected_option === "B" ||
          a?.selected_option === "C" ||
          a?.selected_option === "D"
            ? a.selected_option
            : null;

        const q = questionMap.get(questionId);
        if (!q) return null;

        const isCorrect = selected !== null && selected === q.correct_option;

        if (isCorrect) {
          score += Number(q.points) || 0;
        }

        return {
          student_id,
          quiz_id,
          question_id: q.id,
          selected_option: selected,
          correct_option: q.correct_option,
          is_correct: isCorrect,
        };
      })
      .filter(Boolean);

    const { data: existing, error: existingError } = await supabase
      .from("leaderboard")
      .select("student_id, quiz_id, score")
      .eq("student_id", student_id)
      .eq("quiz_id", quiz_id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({
        ok: true,
        locked: true,
        first_score: Number(existing.score) || 0,
        score: Number(existing.score) || 0,
        message:
          "This quiz was already submitted before. First score is protected.",
        answers: resultAnswers.map((a) => ({
          question_id: a!.question_id,
          selected_option: a!.selected_option,
          correct_option: a!.correct_option,
          is_correct: a!.is_correct,
        })),
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

    if (resultAnswers.length > 0) {
      const { error: insertAnswersError } = await supabase
        .from("quiz_attempt_answers")
        .insert(resultAnswers);

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
      locked: false,
      score,
      message: "First score and answers saved successfully.",
      answers: resultAnswers.map((a) => ({
        question_id: a!.question_id,
        selected_option: a!.selected_option,
        correct_option: a!.correct_option,
        is_correct: a!.is_correct,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}