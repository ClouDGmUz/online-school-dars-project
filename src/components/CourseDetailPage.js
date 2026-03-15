import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  doc, getDoc, collection, onSnapshot, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, BookOpen, ClipboardList, Calendar,
  Loader2, CheckCircle2, Clock, Eye,
} from 'lucide-react';
import HomeworkAttempt from './HomeworkAttempt';

const CourseDetailPage = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const [course,        setCourse]        = useState(null);
  const [homeworks,     setHomeworks]     = useState([]);
  const [submissionMap, setSubmissionMap] = useState({}); // { [homeworkId]: submission }
  const [loading,       setLoading]       = useState(true);
  const [activeHw,      setActiveHw]      = useState(null);

  /* fetch course once */
  useEffect(() => {
    getDoc(doc(db, 'courses', id)).then((snap) => {
      if (snap.exists()) setCourse({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
  }, [id]);

  /* live homeworks */
  useEffect(() => {
    const q = query(collection(db, 'homeworks'), where('courseId', '==', id));
    return onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      setHomeworks(sorted);
    });
  }, [id]);

  /* live submissions for this student in this course — updates badges instantly */
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'submissions'),
      where('userId',   '==', currentUser.uid),
      where('courseId', '==', id),
    );
    return onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const sub = { id: d.id, ...d.data() };
        map[sub.homeworkId] = sub;
      });
      setSubmissionMap(map);
    });
  }, [currentUser, id]);

  const formatDate = (ts) => {
    if (!ts) return null;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const daysLeft = (ts) => {
    if (!ts) return null;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
  };

  /* submission status badge */
  const StatusBadge = ({ sub }) => {
    if (sub.status === 'auto_checked') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          {sub.score}/{sub.autoTotal} pts
        </span>
      );
    }
    if (sub.status === 'pending_review') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
          <Clock className="h-3 w-3" /> Pending review
        </span>
      );
    }
    if (sub.status === 'reviewed') {
      const total = (sub.score ?? 0) + (sub.teacherScore ?? 0);
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          <CheckCircle2 className="h-3 w-3" /> {total} pts
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <p className="text-slate-500">Course not found.</p>
        <Link to="/courses" className="mt-4 inline-flex items-center gap-1 text-sm text-slate-900 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to courses
        </Link>
      </main>
    );
  }

  const doneCount = homeworks.filter((hw) => submissionMap[hw.id]).length;

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-8">

      {/* Back */}
      <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 px-8 py-8 text-white shadow-md">
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1">Course</p>
            <h1 className="text-2xl font-bold leading-tight">{course.title}</h1>
            {course.description && (
              <p className="mt-2 text-slate-300 text-sm leading-relaxed">{course.description}</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex items-center gap-5 border-t border-white/10 pt-5">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <span>{homeworks.length} assignment{homeworks.length !== 1 ? 's' : ''}</span>
          </div>
          {homeworks.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{doneCount} / {homeworks.length} done</span>
            </div>
          )}
        </div>
      </div>

      {/* Rich course content */}
      {course.content && (
        <div className="rounded-2xl border border-slate-200 bg-white px-7 py-6 shadow-sm">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: course.content }} />
        </div>
      )}

      {/* Homework section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-slate-500" />
          Homework Assignments
        </h2>

        {homeworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-600 font-semibold">No homework assigned yet</p>
            <p className="text-sm text-slate-400 mt-1">Check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {homeworks.map((hw, i) => {
              const days      = daysLeft(hw.dueDate);
              const isOverdue = days !== null && days < 0;
              const isDueSoon = days !== null && days >= 0 && days <= 3;
              const sub       = submissionMap[hw.id];
              const isDone    = !!sub;

              return (
                <div
                  key={hw.id}
                  className={`group flex gap-4 rounded-2xl border bg-white p-5 transition-all ${
                    isDone
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Number badge */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                      isDone    ? 'bg-emerald-100 text-emerald-700'
                      : isOverdue ? 'bg-red-100 text-red-600'
                      : isDueSoon ? 'bg-amber-100 text-amber-600'
                      : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < homeworks.length - 1 && (
                      <div className="mt-2 w-px flex-1 bg-slate-100 min-h-[16px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-base leading-snug">{hw.title}</h3>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {/* Submission status */}
                        {sub && <StatusBadge sub={sub} />}

                        {/* Due date badge (only if not done) */}
                        {!isDone && days !== null && (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            isOverdue  ? 'bg-red-50 text-red-600'
                            : isDueSoon ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {isOverdue ? <><Clock className="h-3 w-3" /> Past due</>
                            : days === 0 ? <><Clock className="h-3 w-3" /> Due today</>
                            : days === 1 ? <><Clock className="h-3 w-3" /> Due tomorrow</>
                            : <><CheckCircle2 className="h-3 w-3" /> {days}d left</>}
                          </span>
                        )}
                      </div>
                    </div>

                    {hw.description && (
                      <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{hw.description}</p>
                    )}

                    {hw.dueDate && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        Due {formatDate(hw.dueDate)}
                      </div>
                    )}

                    {/* Action button */}
                    {hw.questions?.length > 0 && (
                      <button
                        onClick={() => setActiveHw(hw)}
                        className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          isDone
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-slate-900 text-white hover:bg-slate-700'
                        }`}
                      >
                        {isDone
                          ? <><Eye className="h-3.5 w-3.5" /> View Results</>
                          : 'Start Homework'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeHw && (
        <HomeworkAttempt
          hw={activeHw}
          userId={currentUser.uid}
          userEmail={currentUser.email}
          courseId={id}
          onClose={() => setActiveHw(null)}
        />
      )}
    </main>
  );
};

export default CourseDetailPage;
