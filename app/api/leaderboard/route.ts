import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase environment variables for leaderboard API.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student_id = user.id;
    const quiz_id = Number(body.quiz_id);
    const answers = Array.isArray(body.answers) ? body.answers : [];

    // soruları çek
    const { data: questions } = await supabase
      .from("questions")
      .select("id, correct_option, points")
      .eq("quiz_id", quiz_id);

    const questionMap = new Map();
    questions?.forEach((q: any) => questionMap.set(q.id, q));

    let score = 0;

    const resultAnswers = answers.map((a: any) => {
      const q = questionMap.get(a.question_id);
      if (!q) return null;

      const isCorrect =
        a.selected_option !== null &&
        a.selected_option === q.correct_option;

      if (isCorrect) score += Number(q.points) || 0;

      return {
        question_id: q.id,
        selected_option: a.selected_option,
        correct_option: q.correct_option,
        is_correct: isCorrect,
      };
    }).filter(Boolean);

    // leaderboard insert
    await supabase.from("leaderboard").insert({
      student_id,
      quiz_id,
      score,
    });

    return NextResponse.json({
      ok: true,
      score,
      answers: resultAnswers, // 🔥 kritik
    });

  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}