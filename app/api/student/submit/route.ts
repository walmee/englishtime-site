import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // service role için güvenli

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const student_id = String(body.student_id || "").trim().toLowerCase();
        const quiz_id = Number(body.quiz_id);
        const score = Number(body.score);

        if (!student_id || !Number.isFinite(quiz_id) || !Number.isFinite(score)) {
            return NextResponse.json(
                { error: "Missing/invalid student_id, quiz_id or score" },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json(
                { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, serviceKey);

        // ✅ “İlk skor” kuralı:
        // unique(student_id, quiz_id) var → aynı quiz ikinci kez çözülürse KAYIT EKLEME
        const { data, error } = await supabase
            .from("leaderboard")
            .upsert(
                [{ student_id, quiz_id, score }],
                { onConflict: "student_id,quiz_id", ignoreDuplicates: true }
            )
            .select()
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // data null gelirse: duplicate olduğu için eklemedi demektir (bu istediğin davranış)
        return NextResponse.json({ ok: true, inserted: !!data }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message || "Unexpected error" },
            { status: 500 }
        );
    }
}