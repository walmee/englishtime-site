import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

type WritingTopicRow = {
  id: number;
  title: string;
  prompt: string;
  class_id: number;
  created_at: string;
};

type SubmissionRow = {
  id: number;
  topic_id: number;
  submission_text: string;
  created_at: string;
  score: number | null;
  feedback: string | null;
  reviewed_at: string | null;
};

export async function GET(req: Request) {
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

    const studentId = user.id;

    const { data: classStudent, error: classStudentError } = await adminSupabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (classStudentError) {
      return NextResponse.json({ error: classStudentError.message }, { status: 500 });
    }

    if (!classStudent?.class_id) {
      return NextResponse.json(
        { error: "No class assigned to this student." },
        { status: 404 }
      );
    }

    const classId = Number(classStudent.class_id);

    const { data: topicData, error: topicError } = await adminSupabase
      .from("writing_topics")
      .select("id, title, prompt, class_id, created_at")
      .eq("class_id", classId)
      .order("id", { ascending: false });

    if (topicError) {
      return NextResponse.json({ error: topicError.message }, { status: 500 });
    }

    const topics = Array.isArray(topicData) ? (topicData as WritingTopicRow[]) : [];

    if (topics.length === 0) {
      return NextResponse.json({
        classId,
        topics: [],
        submissions: [],
      });
    }

    const topicIds = topics.map((t) => t.id);

    const { data: submissionData, error: submissionError } = await adminSupabase
      .from("writing_submissions")
      .select("id, topic_id, submission_text, created_at, score, feedback, reviewed_at")
      .eq("student_id", studentId)
      .in("topic_id", topicIds);

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message }, { status: 500 });
    }

    const submissions = Array.isArray(submissionData)
      ? (submissionData as SubmissionRow[])
      : [];

    return NextResponse.json({
      classId,
      topics,
      submissions,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const topicId = Number(body?.topic_id);
    const submissionText = String(body?.submission_text || "").trim();

    if (!topicId) {
      return NextResponse.json({ error: "topic_id is required." }, { status: 400 });
    }

    if (!submissionText) {
      return NextResponse.json(
        { error: "Please write your paragraph before submitting." },
        { status: 400 }
      );
    }

    const studentId = user.id;

    const { data: classStudent, error: classStudentError } = await adminSupabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (classStudentError) {
      return NextResponse.json({ error: classStudentError.message }, { status: 500 });
    }

    if (!classStudent?.class_id) {
      return NextResponse.json(
        { error: "No class assigned to this student." },
        { status: 404 }
      );
    }

    const classId = Number(classStudent.class_id);

    const { data: topicRow, error: topicError } = await adminSupabase
      .from("writing_topics")
      .select("id, class_id")
      .eq("id", topicId)
      .maybeSingle();

    if (topicError) {
      return NextResponse.json({ error: topicError.message }, { status: 500 });
    }

    if (!topicRow) {
      return NextResponse.json({ error: "Writing topic not found." }, { status: 404 });
    }

    if (Number(topicRow.class_id) !== classId) {
      return NextResponse.json(
        { error: "You are not allowed to submit to this writing task." },
        { status: 403 }
      );
    }

    const { data: existingSubmission, error: existingError } = await adminSupabase
      .from("writing_submissions")
      .select("id")
      .eq("student_id", studentId)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You already submitted this writing task." },
        { status: 409 }
      );
    }

    const { error: insertError } = await adminSupabase
      .from("writing_submissions")
      .insert({
        topic_id: topicId,
        student_id: studentId,
        submission_text: submissionText,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Your writing has been submitted successfully.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}