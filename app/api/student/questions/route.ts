import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, anonKey);

  const body = await req.json();
  const quiz_id = Number(body.quiz_id);

  if (!quiz_id) {
    return NextResponse.json({ error: "quiz_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("questions")
    .select("id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,points")
    .eq("quiz_id", quiz_id)
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data ?? [] });
}
