import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

type QuestionPayload = {
  id?: number;
  quiz_id?: number;
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: "A" | "B" | "C" | "D";
  points?: number;
  explanation?: string | null;
};

async function getTeacherUser(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
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
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = String(profile.role || "").toLowerCase();

  if (role !== "teacher" && role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, role };
}

async function getAllowedClassNamesForTeacher(teacherId: string) {
  const { data, error } = await adminSupabase
    .from("teacher_classes")
    .select(
      `
      class_id,
      classes (
        class_name
      )
    `
    )
    .eq("teacher_id", teacherId);

  if (error) return [];

  return (data || [])
    .map((row: any) => row.classes?.class_name)
    .filter(Boolean);
}

async function teacherCanAccessQuiz(teacherId: string, quizId: number) {
  const allowedClassNames = await getAllowedClassNamesForTeacher(teacherId);
  if (allowedClassNames.length === 0) return false;

  const { data: quizRow, error } = await adminSupabase
    .from("quizzes")
    .select("id, class_name")
    .eq("id", quizId)
    .single();

  if (error || !quizRow) return false;

  return allowedClassNames.includes(quizRow.class_name);
}

function validatePayload(body: QuestionPayload, requireQuizId = true) {
  if (requireQuizId && !Number(body.quiz_id)) return "quiz_id is required.";
  if (!String(body.question_text || "").trim()) return "question_text is required.";
  if (!String(body.option_a || "").trim()) return "option_a is required.";
  if (!String(body.option_b || "").trim()) return "option_b is required.";
  if (!String(body.option_c || "").trim()) return "option_c is required.";
  if (!String(body.option_d || "").trim()) return "option_d is required.";
  if (!["A", "B", "C", "D"].includes(String(body.correct_option || ""))) {
    return "correct_option must be A, B, C, or D.";
  }
  if (!Number.isFinite(Number(body.points)) || Number(body.points) <= 0) {
    return "points must be a positive number.";
  }
  return "";
}

export async function GET(req: Request) {
  try {
    const auth = await getTeacherUser(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const quizId = Number(searchParams.get("quiz_id"));

    if (!quizId) {
      return NextResponse.json({ error: "quiz_id is required" }, { status: 400 });
    }

    if (auth.role === "teacher") {
      const allowed = await teacherCanAccessQuiz(auth.user.id, quizId);
      if (!allowed) {
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

export async function POST(req: Request) {
  try {
    const auth = await getTeacherUser(req);
    if ("error" in auth) return auth.error;

    const body: QuestionPayload = await req.json();
    const validationError = validatePayload(body, true);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const quizId = Number(body.quiz_id);

    if (auth.role === "teacher") {
      const allowed = await teacherCanAccessQuiz(auth.user.id, quizId);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const payload = {
      quiz_id: quizId,
      question_text: String(body.question_text).trim(),
      option_a: String(body.option_a).trim(),
      option_b: String(body.option_b).trim(),
      option_c: String(body.option_c).trim(),
      option_d: String(body.option_d).trim(),
      correct_option: body.correct_option,
      points: Number(body.points),
      explanation: String(body.explanation || "").trim() || null,
    };

    const { error } = await adminSupabase.from("questions").insert(payload);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getTeacherUser(req);
    if ("error" in auth) return auth.error;

    const body: QuestionPayload = await req.json();
    const questionId = Number(body.id);

    if (!questionId) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const validationError = validatePayload(body, false);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data: existingQuestion, error: existingQuestionError } = await adminSupabase
      .from("questions")
      .select("id, quiz_id")
      .eq("id", questionId)
      .single();

    if (existingQuestionError || !existingQuestion) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    if (auth.role === "teacher") {
      const allowed = await teacherCanAccessQuiz(auth.user.id, Number(existingQuestion.quiz_id));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const payload = {
      question_text: String(body.question_text).trim(),
      option_a: String(body.option_a).trim(),
      option_b: String(body.option_b).trim(),
      option_c: String(body.option_c).trim(),
      option_d: String(body.option_d).trim(),
      correct_option: body.correct_option,
      points: Number(body.points),
      explanation: String(body.explanation || "").trim() || null,
    };

    const { error } = await adminSupabase
      .from("questions")
      .update(payload)
      .eq("id", questionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getTeacherUser(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const questionId = Number(searchParams.get("id"));

    if (!questionId) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const { data: existingQuestion, error: existingQuestionError } = await adminSupabase
      .from("questions")
      .select("id, quiz_id")
      .eq("id", questionId)
      .single();

    if (existingQuestionError || !existingQuestion) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    if (auth.role === "teacher") {
      const allowed = await teacherCanAccessQuiz(auth.user.id, Number(existingQuestion.quiz_id));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { error } = await adminSupabase
      .from("questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}