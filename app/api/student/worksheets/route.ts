import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing Supabase environment variables.");
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

type WorksheetRow = {
  id: number;
  title: string;
  description?: string | null;
  file_url?: string | null;
  class_id?: number | null;
  created_at?: string | null;
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

    const { data, error } = await adminSupabase
      .from("worksheets")
      .select("id, title, description, file_url, class_id, created_at")
      .eq("class_id", classId)
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      classId,
      worksheets: Array.isArray(data) ? (data as WorksheetRow[]) : [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}