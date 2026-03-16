import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type LeaderboardBaseRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  profiles: {
    username: string | null;
    level: string | null;
    role?: string | null;
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

type ProfileRow = {
  id: string;
  username: string | null;
  level: string | null;
  role: string | null;
};

type LeaderboardEntry = {
  student_id: string;
  username: string;
  level: string;
  total_score: number;
  quizzes_count: number;
};

function groupLeaderboard(rows: LeaderboardBaseRow[]): LeaderboardEntry[] {
  const grouped = new Map<string, LeaderboardEntry>();

  for (const row of rows) {
    if (!grouped.has(row.student_id)) {
      grouped.set(row.student_id, {
        student_id: row.student_id,
        username: row.profiles?.username || "Unknown Student",
        level: row.profiles?.level || "-",
        total_score: 0,
        quizzes_count: 0,
      });
    }

    const current = grouped.get(row.student_id)!;
    current.total_score += Number(row.score) || 0;
    current.quizzes_count += 1;
  }

  return Array.from(grouped.values()).sort(
    (a, b) => b.total_score - a.total_score
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const studentId = String(
      req.nextUrl.searchParams.get("student_id") || ""
    ).trim();

    const { data: rawLeaderboard, error: leaderboardError } = await supabase
      .from("leaderboard")
      .select(`
        student_id,
        quiz_id,
        score,
        profiles:student_id (
          username,
          level,
          role
        )
      `)
      .order("score", { ascending: false });

    if (leaderboardError) {
      return NextResponse.json(
        { error: leaderboardError.message },
        { status: 500 }
      );
    }

    const allRows = (rawLeaderboard || []) as unknown as LeaderboardBaseRow[];
    const overallLeaderboard = groupLeaderboard(allRows);

    if (!studentId) {
      return NextResponse.json(
        {
          overallLeaderboard,
          classLeaderboard: overallLeaderboard,
          levelLeaderboard: overallLeaderboard,
          currentClassName: "All Classes",
          currentLevel: "All Levels",
        },
        { status: 200 }
      );
    }

    const { data: myProfile, error: myProfileError } = await supabase
      .from("profiles")
      .select("id, username, level, role")
      .eq("id", studentId)
      .single();

    if (myProfileError || !myProfile) {
      return NextResponse.json(
        {
          overallLeaderboard,
          classLeaderboard: overallLeaderboard,
          levelLeaderboard: overallLeaderboard,
          currentClassName: "All Classes",
          currentLevel: "All Levels",
        },
        { status: 200 }
      );
    }

    const me = myProfile as ProfileRow;
    const myLevel = me.level || null;
    const myRole = me.role || "student";

    if (myRole === "admin" || myRole === "teacher") {
      return NextResponse.json(
        {
          overallLeaderboard,
          classLeaderboard: overallLeaderboard,
          levelLeaderboard: overallLeaderboard,
          currentClassName: "All Classes",
          currentLevel: "All Levels",
        },
        { status: 200 }
      );
    }

    const { data: myClassRelation } = await supabase
      .from("class_students")
      .select("class_id, student_id")
      .eq("student_id", studentId)
      .maybeSingle();

    let currentClassName: string | null = null;
    let classLeaderboard: LeaderboardEntry[] = [];

    if (myClassRelation?.class_id) {
      const myClassId = myClassRelation.class_id as number;

      const { data: classInfo } = await supabase
        .from("classes")
        .select("id, class_name")
        .eq("id", myClassId)
        .single();

      currentClassName = (classInfo as ClassRow | null)?.class_name || null;

      const { data: classStudentsData } = await supabase
        .from("class_students")
        .select("class_id, student_id")
        .eq("class_id", myClassId);

      const classStudents = (classStudentsData || []) as ClassStudentRow[];
      const classStudentIds = classStudents.map((r) => r.student_id);

      const classRows = allRows.filter((row) =>
        classStudentIds.includes(row.student_id)
      );

      classLeaderboard = groupLeaderboard(classRows);
    }

    const levelRows = allRows.filter(
      (row) => row.profiles?.level && row.profiles.level === myLevel
    );
    const levelLeaderboard = groupLeaderboard(levelRows);

    return NextResponse.json(
      {
        overallLeaderboard,
        classLeaderboard,
        levelLeaderboard,
        currentClassName,
        currentLevel: myLevel,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}