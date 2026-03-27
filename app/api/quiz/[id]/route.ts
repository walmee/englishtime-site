import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const quizId = Number(id);

    if (!quizId) {
      return NextResponse.json(
        { error: "Invalid quiz id" },
        { status: 400 }
      );
    }

    const { data: quiz, error: quizError } = await adminSupabase
      .from("quizzes")
      .select("id, title, unit, level, class_name")
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

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role, level, class_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 403 }
      );
    }

    const role = String(profile.role || "").toLowerCase();

    if (role !== "admin" && role !== "teacher") {
      let userClassName = profile.class_name ? String(profile.class_name).trim() : "all";

      const { data: classStudent } = await adminSupabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", user.id)
        .maybeSingle();

      if (classStudent?.class_id) {
        const { data: classRow } = await adminSupabase
          .from("classes")
          .select("class_name")
          .eq("id", classStudent.class_id)
          .maybeSingle();

        if (classRow?.class_name) {
          userClassName = String(classRow.class_name).trim();
        }
      }

      const userLevel = profile.level ? String(profile.level).trim() : "all";
      const quizLevel = quiz.level ? String(quiz.level).trim() : "all";
      const quizClassName = quiz.class_name ? String(quiz.class_name).trim() : "all";

      const levelAllowed = quizLevel === "all" || quizLevel === userLevel;
      const classAllowed = quizClassName === "all" || quizClassName === userClassName;

      if (!levelAllowed || !classAllowed) {
        return NextResponse.json(
          { error: "You are not allowed to view this quiz." },
          { status: 403 }
        );
      }
    }

    const { data: questions, error: questionsError } = await adminSupabase
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
      quiz: {
        id: quiz.id,
        title: quiz.title,
        unit: quiz.unit,
      },
      questions: questions || [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}