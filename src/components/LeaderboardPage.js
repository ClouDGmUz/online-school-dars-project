import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Trophy, Loader2, Medal } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const MEDAL = ['🥇', '🥈', '🥉'];

const LeaderboardPage = () => {
  const { currentUser } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'submissions'), (snap) => {
      /* aggregate by userId */
      const byUser = {};
      snap.docs.forEach((d) => {
        const sub = d.data();
        if (!sub.userId) return;

        if (!byUser[sub.userId]) {
          byUser[sub.userId] = {
            userId:    sub.userId,
            email:     sub.userEmail || sub.userId,
            autoScore: 0,
            teacherScore: 0,
            hwCount:   0,
          };
        }
        byUser[sub.userId].autoScore    += sub.score        ?? 0;
        byUser[sub.userId].teacherScore += sub.teacherScore ?? 0;
        byUser[sub.userId].hwCount      += 1;
      });

      const sorted = Object.values(byUser)
        .map((u) => ({ ...u, total: u.autoScore + u.teacherScore }))
        .sort((a, b) => b.total - a.total || b.hwCount - a.hwCount);

      setRankings(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const displayName = (email) => email?.split('@')[0] ?? '—';
  const avatar      = (email) => (email?.[0] ?? '?').toUpperCase();

  /* top-3 podium colors */
  const podiumStyle = [
    'from-amber-400 to-amber-500',   // gold
    'from-slate-400 to-slate-500',   // silver
    'from-amber-600 to-amber-700',   // bronze
  ];

  const top3    = rankings.slice(0, 3);
  const theRest = rankings.slice(3);

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Leaderboard</h1>
          <p className="text-sm text-slate-500">Top students by total points</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : rankings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <Trophy className="h-10 w-10 text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">No submissions yet</p>
          <p className="text-sm text-slate-400 mt-1">Complete a homework to appear here.</p>
        </div>
      ) : (
        <>
          {/* ── Podium (top 3) ── */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3 items-end">
              {/* Reorder: 2nd — 1st — 3rd visually */}
              {[top3[1], top3[0], top3[2]].map((user, visIdx) => {
                if (!user) return <div key={visIdx} />;

                /* map visual slot back to actual rank */
                const rank      = visIdx === 0 ? 1 : visIdx === 1 ? 0 : 2; // index in top3
                const rankNum   = rank + 1;
                const isMe      = user.userId === currentUser?.uid;
                const heights   = ['h-28', 'h-36', 'h-24']; // 2nd, 1st, 3rd

                return (
                  <div key={user.userId} className="flex flex-col items-center gap-2">
                    {/* Medal emoji */}
                    <span className="text-2xl">{MEDAL[rank]}</span>

                    {/* Avatar */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${podiumStyle[rank]} text-white text-lg font-bold shadow-md ${isMe ? 'ring-2 ring-offset-2 ring-slate-900' : ''}`}>
                      {avatar(user.email)}
                    </div>

                    <p className={`text-xs font-semibold text-center truncate w-full px-1 ${isMe ? 'text-slate-900' : 'text-slate-600'}`}>
                      {displayName(user.email)}
                      {isMe && <span className="text-blue-500 ml-0.5">·you</span>}
                    </p>

                    {/* Podium block */}
                    <div className={`w-full ${heights[visIdx]} rounded-t-xl bg-gradient-to-b ${podiumStyle[rank]} flex flex-col items-center justify-center shadow-sm`}>
                      <p className="text-white text-xl font-bold">{user.total}</p>
                      <p className="text-white/70 text-xs">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Full rankings table ── */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 w-10">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Student</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">Points</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 hidden sm:table-cell">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((user, i) => {
                    const isMe = user.userId === currentUser?.uid;
                    return (
                      <tr
                        key={user.userId}
                        className={`border-b border-slate-50 last:border-0 transition-colors ${
                          isMe ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-xs text-slate-400 font-medium">
                          {i < 3 ? MEDAL[i] : i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white bg-gradient-to-br ${
                              i === 0 ? podiumStyle[0] : i === 1 ? podiumStyle[1] : i === 2 ? podiumStyle[2] : 'from-slate-500 to-slate-600'
                            }`}>
                              {avatar(user.email)}
                            </div>
                            <span className={`font-medium truncate ${isMe ? 'text-blue-700' : 'text-slate-700'}`}>
                              {displayName(user.email)}
                              {isMe && <span className="ml-1.5 text-xs text-blue-400 font-normal">you</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {user.total}
                          {user.teacherScore > 0 && (
                            <span className="ml-1 text-xs text-slate-400 font-normal">(+{user.teacherScore} teacher)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                          {user.hwCount} hw
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
};

export default LeaderboardPage;
