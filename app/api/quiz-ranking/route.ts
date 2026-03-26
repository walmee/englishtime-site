import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { searchParams } = new URL(req.url);
  const quizIdRaw = searchParams.get("quiz_id");
  const quizId = Number(quizIdRaw);

  if (!quizIdRaw || !Number.isFinite(quizId)) {
    return NextResponse.json({ error: "Valid quiz_id is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leaderboard")
    .select("student_id, quiz_id, score, created_at")
    .eq("quiz_id", quizId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = Array.isArray(data) ? (data as LeaderboardRow[]) : [];

  const firstByStudent = new Map<string, LeaderboardRow>();
  rows.forEach((row) => {
    if (!firstByStudent.has(row.student_id)) {
      firstByStudent.set(row.student_id, row);
    }
  });

  const dedupedRows = Array.from(firstByStudent.values());
  const studentIds = dedupedRows.map((row) => row.student_id);

  if (studentIds.length === 0) {
    return NextResponse.json({ ranking: [] });
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", studentIds);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const profileMap: Record<string, string> = {};
  ((profileData || []) as ProfileRow[]).forEach((profile) => {
    profileMap[profile.id] = profile.username || "Student";
  });

  const ranking = dedupedRows
    .map((row) => ({
      student_id: row.student_id,
      username: profileMap[row.student_id] || "Student",
      score: Number(row.score) || 0,
    }))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));

  return NextResponse.json({ ranking });
}