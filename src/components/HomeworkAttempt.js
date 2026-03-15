import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, CheckCircle2, XCircle, Loader2, MessageSquare, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';

const TYPE_LABELS = {
  multiple_choice: 'Multiple Choice',
  short_answer:    'Short Answer',
  true_false:      'True / False',
  manual_text:     'Written Answer',
};

function normalizeAnswer(val) {
  return String(val ?? '').trim().toLowerCase().replace(',', '.');
}

function checkAnswer(question, userAnswer) {
  if (question.type === 'manual_text') return null;
  return normalizeAnswer(userAnswer) === normalizeAnswer(question.correctAnswer);
}

/* ── per-question input ── */
const QuestionInput = ({ q, value, onChange }) => {
  if (q.type === 'multiple_choice') {
    return (
      <div className="space-y-2">
        {(q.options || []).filter(Boolean).map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
              value === opt ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio" name={q.id} value={opt}
              checked={value === opt} onChange={() => onChange(opt)}
              className="accent-slate-900"
            />
            <span className="text-sm text-slate-700">{opt}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.type === 'true_false') {
    return (
      <div className="flex gap-2">
        {['true', 'false'].map((opt) => (
          <button
            key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
              value === opt
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >
            {opt === 'true' ? 'True' : 'False'}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'manual_text') {
    return (
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Write your answer here…" rows={3}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 resize-none"
      />
    );
  }
  return (
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer…"
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
    />
  );
};

/* ── main component ── */
const HomeworkAttempt = ({ hw, userId, userEmail, courseId, onClose }) => {
  const [answers, setAnswers]       = useState({});
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying]     = useState(false);

  const questions = hw.questions || [];

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'submissions'),
            where('userId',     '==', userId),
            where('homeworkId', '==', hw.id),
          )
        );
        if (!snap.empty) setSubmission({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [hw.id, userId]);

  const setAnswer = (qId, val) => setAnswers((p) => ({ ...p, [qId]: val }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      /* build results — include questionText/type/points for admin review */
      const results = questions.map((q) => {
        const userAnswer = answers[q.id] ?? '';
        return {
          questionId:   q.id,
          questionText: q.question,
          questionType: q.type,
          points:       q.points || 1,
          answer:       String(userAnswer),
          isCorrect:    checkAnswer(q, userAnswer),
        };
      });

      const autoScore = results.reduce(
        (sum, r, i) => questions[i].type === 'manual_text' ? sum : sum + (r.isCorrect ? (questions[i].points || 1) : 0),
        0
      );
      const autoTotal = questions
        .filter((q) => q.type !== 'manual_text')
        .reduce((sum, q) => sum + (q.points || 1), 0);
      const hasManual = questions.some((q) => q.type === 'manual_text');

      const payload = {
        userId,
        userEmail:   userEmail || '',
        homeworkId:  hw.id,
        hwTitle:     hw.title,
        courseId,
        answers:     results,
        score:       autoScore,
        autoTotal,
        totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
        status:      hasManual ? 'pending_review' : 'auto_checked',
        submittedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'submissions'), payload);
      setSubmission({ ...payload, submittedAt: new Date() });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await deleteDoc(doc(db, 'submissions', submission.id));
      setSubmission(null);
      setAnswers({});
    } finally {
      setRetrying(false);
    }
  };

  const getResult = (qId) => submission?.answers?.find((a) => a.questionId === qId);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{hw.title}</h2>
            {submission ? (
              <p className="text-xs text-slate-500 mt-0.5">
                {submission.status === 'auto_checked'
                  ? `Score: ${submission.score} / ${submission.autoTotal} pts`
                  : `Auto: ${submission.score}/${submission.autoTotal} · written answers pending review`}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p>This homework has no questions yet.</p>
            </div>
          ) : (
            <>
              {hw.description && <p className="text-sm text-slate-500">{hw.description}</p>}

              {questions.map((q, i) => {
                const result     = getResult(q.id);
                const isSubmitted = !!submission;
                return (
                  <div key={q.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                          {i + 1}. {TYPE_LABELS[q.type]}
                          {q.points > 1 && <span className="ml-1 normal-case">· {q.points} pts</span>}
                        </span>
                        <p className="mt-1 font-medium text-slate-900">{q.question}</p>
                      </div>
                      {isSubmitted && result?.isCorrect === true  && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-1" />}
                      {isSubmitted && result?.isCorrect === false && <XCircle       className="h-5 w-5 text-red-500 shrink-0 mt-1" />}
                      {isSubmitted && result?.isCorrect === null  && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full shrink-0 mt-1 whitespace-nowrap">Pending</span>
                      )}
                    </div>

                    {isSubmitted ? (
                      <div className="space-y-1.5">
                        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-slate-400 block mb-0.5">Your answer</span>
                          {result?.answer || <em className="text-slate-400">No answer given</em>}
                        </div>
                        {result?.isCorrect === false && (
                          <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                            <span className="text-xs text-emerald-600 block mb-0.5">Correct answer</span>
                            {String(q.correctAnswer)}
                          </div>
                        )}
                        {q.explanation && result?.isCorrect !== null && (
                          <p className="text-xs text-slate-500 italic px-1">{q.explanation}</p>
                        )}
                      </div>
                    ) : (
                      <QuestionInput q={q} value={answers[q.id] ?? ''} onChange={(val) => setAnswer(q.id, val)} />
                    )}
                  </div>
                );
              })}

              {!submission && (
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Submit Homework
                  </Button>
                </div>
              )}

              {submission && (
                <div className={`rounded-xl p-4 text-center ${
                  submission.status === 'auto_checked' ? 'bg-emerald-50'
                  : submission.status === 'reviewed'   ? 'bg-blue-50'
                  : 'bg-amber-50'
                }`}>
                  {submission.status === 'auto_checked' && (
                    <>
                      <BarChart3 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
                      <p className="font-semibold text-emerald-800">{submission.score} / {submission.autoTotal} points</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Homework completed</p>
                    </>
                  )}
                  {submission.status === 'pending_review' && (
                    <>
                      <MessageSquare className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                      <p className="font-semibold text-amber-800">Auto: {submission.score} / {submission.autoTotal}</p>
                      <p className="text-xs text-amber-600 mt-0.5">Written answers are pending teacher review</p>
                    </>
                  )}
                  {submission.status === 'reviewed' && (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <p className="font-semibold text-blue-800">
                        Auto {submission.score}/{submission.autoTotal}
                        {submission.teacherScore != null && ` + ${submission.teacherScore} teacher pts`}
                      </p>
                      {submission.teacherComment && (
                        <p className="text-xs text-blue-600 mt-1 italic">"{submission.teacherComment}"</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeworkAttempt;
