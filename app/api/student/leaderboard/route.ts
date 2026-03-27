import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const student_id = searchParams.get("student_id");

    if (!student_id) {
      return NextResponse.json(
        { error: "student_id is required" },
        { status: 400 }
      );
    }

    // 👇 kullanıcının class + level bilgisi
    const { data: profile } = await supabase
      .from("profiles")
      .select("class_name, level")
      .eq("id", student_id)
      .single();

    const currentClassName = profile?.class_name || null;
    const currentLevel = profile?.level || null;

    // 👇 leaderboard ham veri
    const { data: leaderboardData } = await supabase
      .from("leaderboard")
      .select("student_id, quiz_id, score");

    const map = new Map<
      string,
      { total_score: number; quizzes: Set<number> }
    >();

    leaderboardData?.forEach((row) => {
      if (!map.has(row.student_id)) {
        map.set(row.student_id, {
          total_score: 0,
          quizzes: new Set(),
        });
      }

      const entry = map.get(row.student_id)!;
      entry.total_score += Number(row.score) || 0;
      entry.quizzes.add(row.quiz_id);
    });

    const studentIds = Array.from(map.keys());

    // 👇 BURASI KRİTİK (service role ile username alıyoruz)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, level, class_name")
      .in("id", studentIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach((p) => {
      profileMap[p.id] = p;
    });

    const allRows = studentIds.map((id) => {
      const entry = map.get(id)!;
      const p = profileMap[id];

      return {
        student_id: id,
        username: p?.username || "Student",
        level: p?.level || "Unknown",
        class_name: p?.class_name || "Unknown",
        total_score: entry.total_score,
        quizzes_count: entry.quizzes.size,
      };
    });

    const sortFn = (a: any, b: any) =>
      b.total_score - a.total_score || a.username.localeCompare(b.username);

    const overallLeaderboard = [...allRows].sort(sortFn);

    const classLeaderboard = currentClassName
      ? allRows.filter((r) => r.class_name === currentClassName).sort(sortFn)
      : [];

    const levelLeaderboard = currentLevel
      ? allRows.filter((r) => r.level === currentLevel).sort(sortFn)
      : [];

    return NextResponse.json({
      classLeaderboard,
      levelLeaderboard,
      overallLeaderboard,
      currentClassName,
      currentLevel,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}