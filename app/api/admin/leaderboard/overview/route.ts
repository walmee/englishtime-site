import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type LeaderboardRow = {
  student_id: string;
  score: number;
  profiles: {
    username: string | null;
    level: string | null;
  } | null;
};

type ClassStudentRow = {
  class_id: number;
  student_id: string;
};

type ClassRow = {
  id: number;
  class_name: string;
};

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing env values." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from("leaderboard")
      .select(`
        student_id,
        score,
        profiles:student_id (
          username,
          level
        )
      `);

    if (leaderboardError) {
      return NextResponse.json(
        { error: leaderboardError.message },
        { status: 500 }
      );
    }

    const rows = (leaderboardData || []) as unknown as LeaderboardRow[];

    const groupedStudents = new Map<
      string,
      {
        student_id: string;
        username: string;
        level: string;
        total_score: number;
        quizzes_count: number;
      }
    >();

    for (const row of rows) {
      if (!groupedStudents.has(row.student_id)) {
        groupedStudents.set(row.student_id, {
          student_id: row.student_id,
          username: row.profiles?.username || "Unknown Student",
          level: row.profiles?.level || "-",
          total_score: 0,
          quizzes_count: 0,
        });
      }

      const current = groupedStudents.get(row.student_id)!;
      current.total_score += Number(row.score) || 0;
      current.quizzes_count += 1;
    }

    const topStudents = Array.from(groupedStudents.values())
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 10);

    const levelStatsMap = new Map<
      string,
      { level: string; students: number; total_score: number }
    >();

    for (const student of groupedStudents.values()) {
      if (!levelStatsMap.has(student.level)) {
        levelStatsMap.set(student.level, {
          level: student.level,
          students: 0,
          total_score: 0,
        });
      }

      const current = levelStatsMap.get(student.level)!;
      current.students += 1;
      current.total_score += student.total_score;
    }

    const levelStats = Array.from(levelStatsMap.values()).sort((a, b) =>
      a.level.localeCompare(b.level)
    );

    const { data: classStudentsData, error: classStudentsError } = await supabase
      .from("class_students")
      .select("class_id, student_id");

    if (classStudentsError) {
      return NextResponse.json(
        { error: classStudentsError.message },
        { status: 500 }
      );
    }

    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, class_name");

    if (classesError) {
      return NextResponse.json(
        { error: classesError.message },
        { status: 500 }
      );
    }

    const classRows = (classStudentsData || []) as ClassStudentRow[];
    const classes = (classesData || []) as ClassRow[];

    const classNameMap = new Map<number, string>();
    classes.forEach((c) => classNameMap.set(c.id, c.class_name));

    const classStatsMap = new Map<
      number,
      { class_name: string; students: number; total_score: number }
    >();

    for (const rel of classRows) {
      const student = groupedStudents.get(rel.student_id);
      if (!student) continue;

      if (!classStatsMap.has(rel.class_id)) {
        classStatsMap.set(rel.class_id, {
          class_name: classNameMap.get(rel.class_id) || `Class ${rel.class_id}`,
          students: 0,
          total_score: 0,
        });
      }

      const current = classStatsMap.get(rel.class_id)!;
      current.students += 1;
      current.total_score += student.total_score;
    }

    const classStats = Array.from(classStatsMap.values()).sort(
      (a, b) => b.total_score - a.total_score
    );

    const totalTests = rows.length;
    const totalStudents = groupedStudents.size;
    const averageScore =
      totalTests > 0
        ? Math.round(
            (rows.reduce((sum, row) => sum + (Number(row.score) || 0), 0) /
              totalTests) *
              10
          ) / 10
        : 0;

    return NextResponse.json(
      {
        stats: {
          totalTests,
          totalStudents,
          averageScore,
        },
        topStudents,
        levelStats,
        classStats,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}