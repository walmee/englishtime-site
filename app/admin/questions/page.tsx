'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type QuizRow = { id: number; title: string; unit: string | null };

type QuestionRow = {
    id: number;
    quiz_id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string; // 'A' | 'B' | 'C' | 'D'
    points: number;
    explanation: string | null;
};

type FormState = {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: 'A' | 'B' | 'C' | 'D';
    points: number;
    explanation: string;
};

const emptyForm = (): FormState => ({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    points: 10,
    explanation: '',
});

export default function AdminQuestionsPage() {
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);

    const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
    const [quizId, setQuizId] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<QuestionRow[]>([]);

    // create form
    const [form, setForm] = useState<FormState>(emptyForm());

    // edit
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<FormState>(emptyForm());

    const selectedQuizLabel = useMemo(() => {
        const q = quizzes.find((x) => x.id === quizId);
        if (!q) return '';
        return `#${q.id} • ${q.unit ?? '-'} • ${q.title}`;
    }, [quizzes, quizId]);

    const loadQuizzes = async () => {
        setMsg('');
        const { data, error } = await supabase
            .from('quizzes')
            .select('id, title, unit')
            .order('id', { ascending: false });

        if (error) {
            setMsg(error.message);
            setQuizzes([]);
            return;
        }

        const qs = Array.isArray(data) ? (data as QuizRow[]) : [];
        setQuizzes(qs);
        if (!quizId && qs.length) setQuizId(qs[0].id);
    };

    const loadQuestions = async (qid: number) => {
        setLoading(true);
        setMsg('');

        const { data, error } = await supabase
            .from('questions')
            .select(
                'id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, points, explanation'
            )
            .eq('quiz_id', qid)
            .order('id', { ascending: true });

        if (error) {
            setMsg(error.message);
            setQuestions([]);
            setLoading(false);
            return;
        }

        setQuestions(Array.isArray(data) ? (data as QuestionRow[]) : []);
        setLoading(false);
    };

    useEffect(() => {
        loadQuizzes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (quizId) {
            loadQuestions(quizId);
            setEditingId(null);
            setForm(emptyForm());
            setEditForm(emptyForm());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizId]);

    const validateForm = (f: FormState) => {
        if (!quizId) return 'Select a quiz first.';
        if (!f.question_text.trim()) return 'Question text is required.';
        if (!f.option_a.trim() || !f.option_b.trim() || !f.option_c.trim() || !f.option_d.trim())
            return 'All options (A, B, C, D) are required.';
        if (!['A', 'B', 'C', 'D'].includes(f.correct_option)) return 'Correct option must be A/B/C/D.';
        if (!Number.isFinite(f.points) || f.points <= 0) return 'Points must be a positive number.';
        return '';
    };

    const onCreate = async () => {
        setMsg('');
        const err = validateForm(form);
        if (err) {
            setMsg(err);
            return;
        }

        setBusy(true);
        try {
            const payload = {
                quiz_id: quizId!,
                question_text: form.question_text.trim(),
                option_a: form.option_a.trim(),
                option_b: form.option_b.trim(),
                option_c: form.option_c.trim(),
                option_d: form.option_d.trim(),
                correct_option: form.correct_option,
                points: Number(form.points),
                explanation: form.explanation.trim() ? form.explanation.trim() : null,
            };

            const { error } = await supabase.from('questions').insert(payload);
            if (error) {
                setMsg(error.message);
                return;
            }

            setForm(emptyForm());
            await loadQuestions(quizId!);
        } finally {
            setBusy(false);
        }
    };

    const startEdit = (q: QuestionRow) => {
        setMsg('');
        setEditingId(q.id);
        setEditForm({
            question_text: q.question_text ?? '',
            option_a: q.option_a ?? '',
            option_b: q.option_b ?? '',
            option_c: q.option_c ?? '',
            option_d: q.option_d ?? '',
            correct_option: (q.correct_option as any) || 'A',
            points: Number(q.points ?? 10),
            explanation: q.explanation ?? '',
        });
        // scroll a bit for UX
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(emptyForm());
    };

    const onUpdate = async () => {
        setMsg('');
        if (!editingId) return;

        const err = validateForm(editForm);
        if (err) {
            setMsg(err);
            return;
        }

        setBusy(true);
        try {
            const payload = {
                question_text: editForm.question_text.trim(),
                option_a: editForm.option_a.trim(),
                option_b: editForm.option_b.trim(),
                option_c: editForm.option_c.trim(),
                option_d: editForm.option_d.trim(),
                correct_option: editForm.correct_option,
                points: Number(editForm.points),
                explanation: editForm.explanation.trim() ? editForm.explanation.trim() : null,
            };

            const { error } = await supabase.from('questions').update(payload).eq('id', editingId);
            if (error) {
                setMsg(error.message);
                return;
            }

            setEditingId(null);
            setEditForm(emptyForm());
            await loadQuestions(quizId!);
        } finally {
            setBusy(false);
        }
    };

    const onDelete = async (id: number) => {
        setMsg('');
        if (!confirm('Delete this question?')) return;

        setBusy(true);
        try {
            const { error } = await supabase.from('questions').delete().eq('id', id);
            if (error) {
                setMsg(error.message);
                return;
            }
            await loadQuestions(quizId!);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* TOP: quiz picker */}
            <div className="bg-yellow-100 border border-black rounded-2xl p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Questions</h2>
                        <p className="text-sm">Pick a quiz, then add / edit / delete questions.</p>
                    </div>

                    <button
                        onClick={() => quizId && loadQuestions(quizId)}
                        className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition disabled:opacity-60"
                        disabled={!quizId || busy}
                    >
                        Refresh
                    </button>
                </div>

                {msg ? (
                    <div className="mt-4 bg-red-100 border border-black rounded-xl p-4">
                        <p className="font-bold">Notice</p>
                        <p className="text-sm">{msg}</p>
                    </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Select quiz</label>
                        <select
                            value={quizId ?? ''}
                            onChange={(e) => setQuizId(Number(e.target.value))}
                            className="w-full p-3 rounded-lg border border-black bg-yellow-50"
                            disabled={busy}
                        >
                            {quizzes.map((q) => (
                                <option key={q.id} value={q.id}>
                                    #{q.id} • {q.unit ?? '-'} • {q.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="border border-dashed border-black rounded-xl p-4 bg-yellow-50">
                        <div className="text-xs opacity-80">Selected</div>
                        <div className="font-bold">{selectedQuizLabel || '—'}</div>
                        <div className="text-xs opacity-80 mt-1">
                            If the quiz list is empty: create a quiz first in Admin → Quizzes.
                        </div>
                    </div>
                </div>
            </div>

            {/* CREATE or EDIT FORM */}
            <div className="bg-yellow-100 border border-black rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">
                    {editingId ? `Edit Question #${editingId}` : 'Add New Question'}
                </h3>

                <div className="grid grid-cols-1 gap-3">
                    <label className="text-sm font-bold">Question text</label>
                    <textarea
                        value={editingId ? editForm.question_text : form.question_text}
                        onChange={(e) =>
                            editingId
                                ? setEditForm((p) => ({ ...p, question_text: e.target.value }))
                                : setForm((p) => ({ ...p, question_text: e.target.value }))
                        }
                        className="w-full p-3 rounded-lg border border-black bg-yellow-50 min-h-[90px]"
                        placeholder="Type the question..."
                        disabled={busy}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(['a', 'b', 'c', 'd'] as const).map((k) => {
                            const key = `option_${k}` as const;
                            const label = `Option ${k.toUpperCase()}`;
                            const value = editingId ? (editForm as any)[key] : (form as any)[key];

                            return (
                                <div key={key}>
                                    <label className="text-sm font-bold">{label}</label>
                                    <input
                                        value={value}
                                        onChange={(e) =>
                                            editingId
                                                ? setEditForm((p) => ({ ...(p as any), [key]: e.target.value }))
                                                : setForm((p) => ({ ...(p as any), [key]: e.target.value }))
                                        }
                                        className="w-full p-3 rounded-lg border border-black bg-yellow-50"
                                        placeholder={`${label}...`}
                                        disabled={busy}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-sm font-bold">Correct option</label>
                            <select
                                value={editingId ? editForm.correct_option : form.correct_option}
                                onChange={(e) => {
                                    const v = e.target.value as 'A' | 'B' | 'C' | 'D';
                                    editingId
                                        ? setEditForm((p) => ({ ...p, correct_option: v }))
                                        : setForm((p) => ({ ...p, correct_option: v }));
                                }}
                                className="w-full p-3 rounded-lg border border-black bg-yellow-50"
                                disabled={busy}
                            >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold">Points</label>
                            <input
                                type="number"
                                value={editingId ? editForm.points : form.points}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    editingId ? setEditForm((p) => ({ ...p, points: v })) : setForm((p) => ({ ...p, points: v }));
                                }}
                                className="w-full p-3 rounded-lg border border-black bg-yellow-50"
                                disabled={busy}
                                min={1}
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            {!editingId ? (
                                <>
                                    <button
                                        onClick={onCreate}
                                        className="w-full px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 disabled:opacity-60"
                                        disabled={!quizId || busy}
                                    >
                                        {busy ? 'Saving...' : 'Add Question'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={onUpdate}
                                        className="w-full px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 disabled:opacity-60"
                                        disabled={!quizId || busy}
                                    >
                                        {busy ? 'Updating...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="px-4 py-3 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition disabled:opacity-60"
                                        disabled={busy}
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold">Explanation (optional)</label>
                        <input
                            value={editingId ? editForm.explanation : form.explanation}
                            onChange={(e) =>
                                editingId
                                    ? setEditForm((p) => ({ ...p, explanation: e.target.value }))
                                    : setForm((p) => ({ ...p, explanation: e.target.value }))
                            }
                            className="w-full p-3 rounded-lg border border-black bg-yellow-50"
                            placeholder="Short explanation (optional)"
                            disabled={busy}
                        />
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="bg-yellow-100 border border-black rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className="text-xl font-bold">Question List</h3>
                    <div className="text-sm opacity-80">
                        {quizId ? `Quiz #${quizId} • ${questions.length} question(s)` : 'Select a quiz'}
                    </div>
                </div>

                {loading ? (
                    <div className="border border-dashed border-black rounded-lg p-8 text-center">Loading...</div>
                ) : questions.length === 0 ? (
                    <div className="border border-dashed border-black rounded-lg p-8 text-center">
                        No questions found for this quiz.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {questions.map((q) => (
                            <div key={q.id} className="bg-yellow-50 border border-black rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                        <div className="font-bold">
                                            #{q.id} • {q.points} pts • Correct: {q.correct_option}
                                        </div>
                                        <div className="text-sm mt-1">{q.question_text}</div>
                                        <div className="text-xs mt-2 space-y-1">
                                            <div>
                                                <b>A)</b> {q.option_a}
                                            </div>
                                            <div>
                                                <b>B)</b> {q.option_b}
                                            </div>
                                            <div>
                                                <b>C)</b> {q.option_c}
                                            </div>
                                            <div>
                                                <b>D)</b> {q.option_d}
                                            </div>
                                            {q.explanation ? (
                                                <div className="mt-2">
                                                    <b>Explanation:</b> {q.explanation}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => startEdit(q)}
                                            className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition disabled:opacity-60"
                                            disabled={busy}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(q.id)}
                                            className="px-3 py-2 rounded-lg border border-black bg-red-200 hover:bg-red-300 transition disabled:opacity-60"
                                            disabled={busy}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="text-xs opacity-80 mt-4">
                    If “insert/update/delete” fails with a permissions error: Supabase RLS/policies are blocking it.
                </div>
            </div>
        </div>
    );
}
