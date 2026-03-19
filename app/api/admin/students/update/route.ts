import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing env values." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const userId = String(body.userId || "").trim();
    const username = String(body.username || "").trim();
    const level = String(body.level || "").trim();
    const class_id = Number(body.class_id);

    if (!userId) {
      return NextResponse.json(
        { error: "User id is required." },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    if (!level) {
      return NextResponse.json(
        { error: "Level is required." },
        { status: 400 }
      );
    }

    if (!class_id || Number.isNaN(class_id)) {
      return NextResponse.json(
        { error: "Class is required." },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: classRow, error: classError } = await adminSupabase
      .from("classes")
      .select("id, class_name")
      .eq("id", class_id)
      .single();

    if (classError || !classRow) {
      return NextResponse.json(
        { error: "Selected class was not found." },
        { status: 400 }
      );
    }

    const { error: profileError } = await adminSupabase
      .from("profiles")
      .update({
        username,
        level,
        class_name: classRow.class_name,
      })
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const { data: existingClassRow, error: existingClassError } = await adminSupabase
      .from("class_students")
      .select("student_id, class_id")
      .eq("student_id", userId)
      .maybeSingle();

    if (existingClassError) {
      return NextResponse.json(
        { error: existingClassError.message },
        { status: 500 }
      );
    }

    if (existingClassRow) {
      const { error: updateClassError } = await adminSupabase
        .from("class_students")
        .update({
          class_id,
        })
        .eq("student_id", userId);

      if (updateClassError) {
        return NextResponse.json(
          { error: updateClassError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: insertClassError } = await adminSupabase
        .from("class_students")
        .insert({
          student_id: userId,
          class_id,
        });

      if (insertClassError) {
        return NextResponse.json(
          { error: insertClassError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Student information updated successfully.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}