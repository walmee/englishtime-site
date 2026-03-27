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
      return NextResponse.json({ error: "Invalid quiz id" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = String(profile.role || "").toLowerCase();

    if (role !== "admin" && role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role === "teacher") {
      const { data: quizRow, error: quizError } = await adminSupabase
        .from("quizzes")
        .select("id, class_name")
        .eq("id", quizId)
        .single();

      if (quizError || !quizRow) {
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
      }

      const { data: teacherClasses, error: teacherClassesError } = await adminSupabase
        .from("teacher_classes")
        .select(
          `
          class_id,
          classes (
            class_name
          )
        `
        )
        .eq("teacher_id", user.id);

      if (teacherClassesError) {
        return NextResponse.json({ error: teacherClassesError.message }, { status: 500 });
      }

      const allowedClassNames = (teacherClasses || [])
        .map((row: any) => row.classes?.class_name)
        .filter(Boolean);

      if (!allowedClassNames.includes(quizRow.class_name)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await adminSupabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, points, explanation"
      )
      .eq("quiz_id", quizId)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}