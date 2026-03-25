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

function normalizeQuestions(input: any): ParsedQuestion[] {
  const rawQuestions = Array.isArray(input?.questions) ? input.questions : [];

  return rawQuestions
    .map((q: any) => ({
      question_text: String(q?.question_text || "").trim(),
      option_a: String(q?.option_a || "").trim(),
      option_b: String(q?.option_b || "").trim(),
      option_c: String(q?.option_c || "").trim(),
      option_d: String(q?.option_d || "").trim(),
      correct_option: String(q?.correct_option || "A").toUpperCase() as "A" | "B" | "C" | "D",
      points: Number(q?.points) > 0 ? Number(q.points) : 10,
      explanation: q?.explanation ? String(q.explanation).trim() : null,
    }))
    .filter(
      (q) =>
        q.question_text &&
        q.option_a &&
        q.option_b &&
        q.option_c &&
        q.option_d &&
        ["A", "B", "C", "D"].includes(q.correct_option)
    );
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "Missing env: OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
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
      return NextResponse.json({ error: "No images uploaded." }, { status: 400 });
    }

    const content: any[] = [
      {
        type: "input_text",
        text:
          "Extract multiple-choice English quiz questions from these uploaded images. " +
          "Return only questions that clearly contain one question stem, four options (A, B, C, D), and one correct option. " +
          "If a question is incomplete, skip it. " +
          "Set points to 10 by default unless the image clearly shows another point value. " +
          "Keep wording clean and readable. " +
          "Return a JSON object with a top-level 'questions' array.",
      },
    ];

    for (const image of images) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const mime = image.type || "image/png";
      const base64 = buffer.toString("base64");

      content.push({
        type: "input_image",
        image_url: `data:${mime};base64,${base64}`,
      });
    }

    const schema = {
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
                  type: ["string", "null"],
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
    };

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4",
        input: [
          {
            role: "user",
            content,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: schema.name,
            schema: schema.schema,
            strict: true,
          },
        },
      }),
    });

    const openaiJson = await openaiRes.json();

    if (!openaiRes.ok) {
      return NextResponse.json(
        { error: openaiJson?.error?.message || "OpenAI request failed." },
        { status: 500 }
      );
    }

    const outputText =
      openaiJson?.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text ||
      openaiJson?.output_text ||
      "";

    if (!outputText) {
      return NextResponse.json(
        { error: "No structured response returned from OpenAI." },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse structured model output." },
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
          : "No complete multiple-choice questions were found in the uploaded images.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}