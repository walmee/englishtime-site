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
    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const level = String(body.level || "A1").trim();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email ve password zorunlu." },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: createdUser, error: createUserError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createUserError) {
      return NextResponse.json(
        { error: createUserError.message },
        { status: 500 }
      );
    }

    const userId = createdUser.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User oluşturuldu ama id alınamadı." },
        { status: 500 }
      );
    }

    const { error: profileError } = await adminSupabase.from("profiles").insert({
      id: userId,
      username,
      role: "student",
      level,
    });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "Öğrenci başarıyla oluşturuldu." },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}