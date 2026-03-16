import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json();

  if (body.secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quiz_id = Number(body.quiz_id);
  const question_text = String(body.question_text || "").trim();

  if (!quiz_id || !question_text) {
    return NextResponse.json(
      { error: "quiz_id and question_text are required" },
      { status: 400 }
    );
  }

  const payload = {
    quiz_id,
    question_text,
    option_a: String(body.option_a || ""),
    option_b: String(body.option_b || ""),
    option_c: String(body.option_c || ""),
    option_d: String(body.option_d || ""),
    correct_option: String(body.correct_option || "A"),
    points: Number(body.points || 1),
  };

  const { data, error } = await supabase
    .from("questions")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
