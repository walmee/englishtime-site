import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ParsedQuestion = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  points: number;
  explanation?: string | null;
};

function normalizeQuestions(input: unknown): ParsedQuestion[] {
  const rawQuestions = Array.isArray((input as { questions?: unknown[] })?.questions)
    ? ((input as { questions: unknown[] }).questions ?? [])
    : [];

  const mapped: ParsedQuestion[] = rawQuestions.map((item: unknown) => {
    const q = (item ?? {}) as Record<string, unknown>;

    const correctRaw = String(q.correct_option ?? "A").toUpperCase();
    const correct_option: "A" | "B" | "C" | "D" =
      correctRaw === "B"
        ? "B"
        : correctRaw === "C"
        ? "C"
        : correctRaw === "D"
        ? "D"
        : "A";

    return {
      question_text: String(q.question_text ?? "").trim(),
      option_a: String(q.option_a ?? "").trim(),
      option_b: String(q.option_b ?? "").trim(),
      option_c: String(q.option_c ?? "").trim(),
      option_d: String(q.option_d ?? "").trim(),
      correct_option,
      points: Number(q.points) > 0 ? Number(q.points) : 10,
      explanation: q.explanation ? String(q.explanation).trim() : null,
    };
  });

  return mapped.filter((q: ParsedQuestion) => {
    return (
      q.question_text.length > 0 &&
      q.option_a.length > 0 &&
      q.option_b.length > 0 &&
      q.option_c.length > 0 &&
      q.option_d.length > 0 &&
      ["A", "B", "C", "D"].includes(q.correct_option)
    );
  });
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    if (!openaiApiKey) {
  return NextResponse.json(
    {
      error: "Missing env: OPENAI_API_KEY",
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
      hasOpenAiKey: !!openaiApiKey,
      vercelEnv: process.env.VERCEL_ENV || null,
    },
    { status: 500 }
  );
}

    const authHeader = req.headers.get("authorization");
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.replace("Bearer ", "")
        : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = String(profile.role || "").toLowerCase();
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const images = formData.getAll("images").filter(Boolean) as File[];

    if (!images.length) {
      return NextResponse.json(
        { error: "No images uploaded." },
        { status: 400 }
      );
    }

    const content: Array<Record<string, string>> = [
      {
        type: "input_text",
        text:
          "Extract English multiple-choice quiz questions from these images. " +
          "Only return complete questions with one question text, four options (A, B, C, D), and one correct answer. " +
          "Skip incomplete or unreadable questions. " +
          "Default points to 10 unless clearly shown otherwise. " +
          "Return valid JSON matching the requested schema only.",
      },
    ];

    for (const image of images) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const mimeType = image.type || "image/png";
      const base64 = buffer.toString("base64");

      content.push({
        type: "input_image",
        image_url: `data:${mimeType};base64,${base64}`,
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "quiz_questions",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      question_text: { type: "string" },
                      option_a: { type: "string" },
                      option_b: { type: "string" },
                      option_c: { type: "string" },
                      option_d: { type: "string" },
                      correct_option: {
                        type: "string",
                        enum: ["A", "B", "C", "D"],
                      },
                      points: { type: "number" },
                      explanation: {
                        anyOf: [{ type: "string" }, { type: "null" }],
                      },
                    },
                    required: [
                      "question_text",
                      "option_a",
                      "option_b",
                      "option_c",
                      "option_d",
                      "correct_option",
                      "points",
                      "explanation",
                    ],
                  },
                },
              },
              required: ["questions"],
            },
          },
        },
      }),
    });

    const openaiJson = await openaiRes.json();

    if (!openaiRes.ok) {
      return NextResponse.json(
        {
          error: openaiJson?.error?.message || "OpenAI request failed.",
        },
        { status: 500 }
      );
    }

    const outputText =
      openaiJson?.output_text ||
      openaiJson?.output?.[0]?.content?.find(
        (c: { type?: string; text?: string }) => c.type === "output_text"
      )?.text ||
      "";

    if (!outputText) {
      return NextResponse.json(
        { error: "No structured response returned from OpenAI." },
        { status: 500 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI output." },
        { status: 500 }
      );
    }

    const questions = normalizeQuestions(parsed);

    return NextResponse.json({
      ok: true,
      questions,
      note:
        questions.length > 0
          ? `${questions.length} question(s) extracted. Review before saving.`
          : "No complete questions found in the uploaded images.",
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Unexpected server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}