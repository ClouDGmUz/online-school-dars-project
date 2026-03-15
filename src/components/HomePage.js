import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, ClipboardList, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import { Card, CardContent } from './ui/card';

/* ── SVG ring chart ── */
const RingChart = ({ percent, size = 128, thickness = 12 }) => {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(percent, 100) / 100 * circ;
  const color =
    percent >= 70 ? '#10b981'   // emerald
    : percent >= 40 ? '#f59e0b' // amber
    : '#ef4444';                // red

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={thickness}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
};

/* ── single horizontal bar ── */
const ScoreBar = ({ label, score, total, hasPending }) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : null;
  const barColor =
    pct === null ? 'bg-slate-300'
    : pct >= 70  ? 'bg-emerald-500'
    : pct >= 40  ? 'bg-amber-400'
    : 'bg-red-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400 truncate max-w-[55%]">{label}</span>
        <span className="text-xs font-semibold text-slate-200 shrink-0">
          {total > 0 ? `${score} / ${total} pts` : '—'}
          {hasPending && <span className="ml-1.5 text-amber-500 font-normal">+review</span>}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        {pct !== null && (
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
};

/* ── main page ── */
const HomePage = () => {
  const { currentUser } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [hwMap, setHwMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const load = async () => {
      try {
        /* 1. fetch all submissions for this user */
        const subSnap = await getDocs(
          query(collection(db, 'submissions'), where('userId', '==', currentUser.uid))
        );
        const subs = subSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0));

        /* 2. batch-fetch homework titles */
        const ids = [...new Set(subs.map((s) => s.homeworkId))];
        const map = {};
        if (ids.length > 0) {
          const hwSnap = await getDocs(
            query(collection(db, 'homeworks'), where(documentId(), 'in', ids.slice(0, 30)))
          );
          hwSnap.docs.forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
        }

        setSubmissions(subs);
        setHwMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser]);

  /* ── derived stats ── */
  const totalScore    = submissions.reduce((s, sub) => s + (sub.score    ?? 0), 0);
  const totalPossible = submissions.reduce((s, sub) => s + (sub.autoTotal ?? 0), 0);
  const accuracy      = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  const pendingCount  = submissions.filter((s) => s.status === 'pending_review').length;

  const accuracyColor =
    accuracy >= 70 ? 'text-emerald-600'
    : accuracy >= 40 ? 'text-amber-500'
    : 'text-red-500';

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const firstName = currentUser?.displayName?.split(' ')[0]
    || currentUser?.email?.split('@')[0]
    || 'there';

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-8">

      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Welcome back, {firstName}!
        </h1>
        <p className="mt-2 text-base text-slate-400">Here's your learning progress.</p>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Points Earned',
            value: loading ? '—' : totalScore,
            sub: loading ? '' : `of ${totalPossible} available`,
            icon: Star,
            color: 'bg-amber-500/20 text-amber-400 border border-amber-500/20',
          },
          {
            label: 'Completed',
            value: loading ? '—' : submissions.length,
            sub: 'homeworks submitted',
            icon: ClipboardList,
            color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
          },
          {
            label: 'Accuracy',
            value: loading ? '—' : `${accuracy}%`,
            sub: 'auto-check questions',
            icon: CheckCircle2,
            color: 'bg-blue-500/20 text-blue-400 border border-blue-500/20',
          },
          {
            label: 'Pending Review',
            value: loading ? '—' : pendingCount,
            sub: 'written answers',
            icon: Clock,
            color: 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-5">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${color} mb-4 shadow-lg`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-bold text-white leading-none tracking-tight">{value}</p>
              <p className="text-sm font-medium text-slate-300 mt-2">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts (only when there's data) ── */}
      {!loading && submissions.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            {/* Accuracy ring */}
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 gap-1">
                <p className="text-sm font-medium text-slate-300 mb-4 tracking-wide uppercase">Overall Accuracy</p>
                <div className="relative">
                  <RingChart percent={accuracy} size={128} thickness={12} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${accuracyColor}`}>{accuracy}%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  {totalScore} correct out of {totalPossible} pts
                </p>
                {totalPossible === 0 && (
                  <p className="text-xs text-slate-400">no auto-check questions yet</p>
                )}
              </CardContent>
            </Card>

            {/* Per-homework bar chart */}
            <Card className="sm:col-span-2">
              <CardContent className="pt-6 pb-6 w-full">
                <p className="text-sm font-medium text-slate-300 mb-6 tracking-wide uppercase">Score per Homework</p>
                <div className="space-y-4">
                  {submissions.slice(0, 7).map((sub) => (
                    <ScoreBar
                      key={sub.id}
                      label={hwMap[sub.homeworkId]?.title || 'Homework'}
                      score={sub.score ?? 0}
                      total={sub.autoTotal ?? 0}
                      hasPending={sub.status === 'pending_review'}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-6 pt-5 border-t border-white/10">
                  {[
                    { color: 'bg-emerald-500', label: '≥ 70%' },
                    { color: 'bg-amber-400',   label: '40–69%' },
                    { color: 'bg-red-400',     label: '< 40%' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={`h-2 w-3 rounded-full ${color}`} />
                      <span className="text-xs text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Recent submissions list ── */}
          <div>
            <h2 className="text-sm font-medium text-slate-300 mb-4 tracking-wide uppercase">Recent Submissions</h2>
            <div className="space-y-2">
              {submissions.slice(0, 5).map((sub) => {
                const hw = hwMap[sub.homeworkId];
                const pct = sub.autoTotal > 0
                  ? Math.round((sub.score / sub.autoTotal) * 100)
                  : null;
                const badgeStyle =
                  pct === null        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                  : pct >= 70         ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : pct >= 40         ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30';

                return (
                  <div
                    key={sub.id}
                    className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md px-5 py-4 hover:bg-white/10 hover:border-white/20 transition-all shadow-sm"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${badgeStyle}`}>
                      {pct !== null ? `${pct}%` : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {hw?.title || 'Homework'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {sub.autoTotal > 0 ? `${sub.score} / ${sub.autoTotal} pts` : ''}
                        {sub.status === 'pending_review' && (
                          <span className="ml-1.5 text-amber-500">written answers pending review</span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatDate(sub.submittedAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && submissions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-white/20 bg-white/5 backdrop-blur-sm py-24 text-center">
          <BookOpen className="h-12 w-12 text-slate-500 mb-4 drop-shadow-lg" />
          <p className="text-lg font-semibold text-slate-200">No submissions yet</p>
          <p className="text-sm text-slate-400 mt-2 max-w-sm">
            Complete a homework to see your stats here.
          </p>
        </div>
      )}

    </main>
  );
};

export default HomePage;
