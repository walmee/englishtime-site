import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const quizId = Number(searchParams.get("quiz_id"));

    if (!quizId) {
      return NextResponse.json({ error: "quiz_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("leaderboard")
      .select("student_id, score, created_at")
      .eq("quiz_id", quizId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];

    const firstByStudent = new Map();
    rows.forEach((row) => {
      if (!firstByStudent.has(row.student_id)) {
        firstByStudent.set(row.student_id, row);
      }
    });

    const deduped = Array.from(firstByStudent.values());
    const ids = deduped.map((r: any) => r.student_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", ids);

    const map: Record<string, string> = {};
    profiles?.forEach((p: any) => {
      map[p.id] = p.username || "Student";
    });

    const ranking = deduped.map((r: any) => ({
      student_id: r.student_id,
      username: map[r.student_id] || "Student",
      score: r.score,
    }));

    return NextResponse.json({ ranking });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}