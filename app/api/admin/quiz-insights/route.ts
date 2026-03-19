import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type AttemptAnswerRow = {
  student_id: string;
  quiz_id: number;
  question_id: number;
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
};

type LeaderboardRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type QuestionRow = {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
};

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing env values." },
        { status: 500 }
      );
    }

    const quizId = Number(req.nextUrl.searchParams.get("quiz_id"));

    if (!quizId) {
      return NextResponse.json(
        { error: "quiz_id is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const [
      leaderboardRes,
      answersRes,
      questionsRes,
      profilesRes,
      quizRes,
    ] = await Promise.all([
      adminSupabase
        .from("leaderboard")
        .select("student_id, quiz_id, score, created_at")
        .eq("quiz_id", quizId),

      adminSupabase
        .from("quiz_attempt_answers")
        .select("student_id, quiz_id, question_id, selected_option, correct_option, is_correct")
        .eq("quiz_id", quizId),

      adminSupabase
        .from("questions")
        .select(
          "id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option"
        )
        .eq("quiz_id", quizId)
        .order("id", { ascending: true }),

      adminSupabase
        .from("profiles")
        .select("id, username")
        .eq("role", "student"),

      adminSupabase
        .from("quizzes")
        .select("id, title, unit")
        .eq("id", quizId)
        .single(),
    ]);

    if (leaderboardRes.error) {
      return NextResponse.json(
        { error: leaderboardRes.error.message },
        { status: 500 }
      );
    }

    if (answersRes.error) {
      return NextResponse.json(
        { error: answersRes.error.message },
        { status: 500 }
      );
    }

    if (questionsRes.error) {
      return NextResponse.json(
        { error: questionsRes.error.message },
        { status: 500 }
      );
    }

    if (profilesRes.error) {
      return NextResponse.json(
        { error: profilesRes.error.message },
        { status: 500 }
      );
    }

    if (quizRes.error) {
      return NextResponse.json(
        { error: quizRes.error.message },
        { status: 500 }
      );
    }

    const leaderboard = (leaderboardRes.data || []) as LeaderboardRow[];
    const answers = (answersRes.data || []) as AttemptAnswerRow[];
    const questions = (questionsRes.data || []) as QuestionRow[];
    const profiles = (profilesRes.data || []) as ProfileRow[];
    const quiz = quizRes.data;

    const usernameMap: Record<string, string> = {};
    for (const p of profiles) {
      usernameMap[p.id] = p.username || "Student";
    }

    const questionMap: Record<number, QuestionRow> = {};
    for (const q of questions) {
      questionMap[q.id] = q;
    }

    const attemptsCount = leaderboard.length;
    const scores = leaderboard.map((x) => Number(x.score || 0));
    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const questionStats = questions.map((q) => {
      const questionAnswers = answers.filter((a) => a.question_id === q.id);
      const wrongCount = questionAnswers.filter((a) => !a.is_correct).length;
      const correctCount = questionAnswers.filter((a) => a.is_correct).length;
      const totalCount = questionAnswers.length;
      const wrongRate = totalCount > 0 ? Math.round((wrongCount / totalCount) * 100) : 0;

      return {
        question_id: q.id,
        question_text: q.question_text,
        correct_option: q.correct_option,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        total_answers: totalCount,
        correct_count: correctCount,
        wrong_count: wrongCount,
        wrong_rate: wrongRate,
      };
    });

    questionStats.sort((a, b) => b.wrong_count - a.wrong_count);

    const studentMistakes = leaderboard.map((entry) => {
      const studentAnswers = answers.filter((a) => a.student_id === entry.student_id);
      const wrongAnswers = studentAnswers
        .filter((a) => !a.is_correct)
        .map((a) => {
          const q = questionMap[a.question_id];
          return {
            question_id: a.question_id,
            question_text: q?.question_text || "Question not found",
            selected_option: a.selected_option,
            correct_option: a.correct_option,
            option_a: q?.option_a || "",
            option_b: q?.option_b || "",
            option_c: q?.option_c || "",
            option_d: q?.option_d || "",
          };
        });

      return {
        student_id: entry.student_id,
        username: usernameMap[entry.student_id] || "Student",
        score: entry.score,
        wrong_count: wrongAnswers.length,
        wrong_answers: wrongAnswers,
      };
    });

    studentMistakes.sort((a, b) => b.wrong_count - a.wrong_count);

    return NextResponse.json({
      ok: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        unit: quiz.unit,
      },
      summary: {
        attempts_count: attemptsCount,
        average_score: averageScore,
        highest_score: highestScore,
        lowest_score: lowestScore,
      },
      most_missed_questions: questionStats,
      student_mistakes: studentMistakes,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}