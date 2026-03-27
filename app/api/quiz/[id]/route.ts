import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const quizId = Number(id);

    if (!quizId) {
      return NextResponse.json(
        { error: "Invalid quiz id" },
        { status: 400 }
      );
    }

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, unit")
      .eq("id", quizId)
      .maybeSingle();

    if (quizError) {
      return NextResponse.json(
        { error: quizError.message },
        { status: 500 }
      );
    }

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, option_a, option_b, option_c, option_d, points"
      )
      .eq("quiz_id", quizId)
      .order("id", { ascending: true });

    if (questionsError) {
      return NextResponse.json(
        { error: questionsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quiz,
      questions: questions || [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}