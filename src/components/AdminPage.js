import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, where, serverTimestamp, getDocs, documentId,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Shield, Users, BookOpen, BarChart3, Plus, Pencil, Trash2,
  X, ClipboardList, ArrowLeft, Loader2,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import RichTextEditor from './RichTextEditor';

/* ── modal ── */
const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
    <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'} rounded-xl bg-white shadow-xl`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

/* ── question type config ── */
const Q_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'short_answer',    label: 'Short Answer'    },
  { value: 'true_false',      label: 'True / False'    },
  { value: 'manual_text',     label: 'Written (manual check)' },
];

const TYPE_COLORS = {
  multiple_choice: 'bg-blue-50 text-blue-700',
  short_answer:    'bg-emerald-50 text-emerald-700',
  true_false:      'bg-violet-50 text-violet-700',
  manual_text:     'bg-amber-50 text-amber-700',
};

const DEFAULT_Q = {
  type: 'multiple_choice',
  question: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: '',
  points: 1,
};

/* ── tabs ── */
const TABS = ['Overview', 'Courses', 'Homeworks', 'Reviews'];

const AdminPage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');

  /* courses */
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseModal, setCourseModal] = useState(null);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', content: '' });
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  /* homeworks */
  const [homeworks, setHomeworks] = useState([]);
  const [hwLoading, setHwLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [hwModal, setHwModal] = useState(null);
  const [hwForm, setHwForm] = useState({ title: '', description: '', dueDate: '', questions: [] });
  const [hwSubmitting, setHwSubmitting] = useState(false);

  /* question builder */
  const [qForm, setQForm] = useState(DEFAULT_Q);
  const [showQForm, setShowQForm] = useState(false);
  const [editQIdx, setEditQIdx] = useState(null);

  /* reviews */
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewModal,    setReviewModal]    = useState(null); // submission object
  const [reviewForm,     setReviewForm]     = useState({ teacherScore: '', comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  /* ── load pending reviews (live) when tab is active ── */
  useEffect(() => {
    if (activeTab !== 'Reviews') return;
    setReviewsLoading(true);
    const q = query(collection(db, 'submissions'), where('status', '==', 'pending_review'));
    const unsub = onSnapshot(q, (snap) => {
      const subs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0));
      setPendingReviews(subs);
      setReviewsLoading(false);
    });
    return () => unsub();
  }, [activeTab]);

  /* ── load courses ── */
  useEffect(() => {
    const q = query(collection(db, 'courses'));
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setCourses(sorted);
      setCoursesLoading(false);
    });
    return () => unsub();
  }, []);

  /* ── load homeworks ── */
  useEffect(() => {
    if (!selectedCourseId) { setHomeworks([]); setHwLoading(false); return; }
    setHwLoading(true);
    const q = query(collection(db, 'homeworks'), where('courseId', '==', selectedCourseId));
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      setHomeworks(sorted);
      setHwLoading(false);
    });
    return () => unsub();
  }, [selectedCourseId]);

  /* ── course CRUD ── */
  const openAddCourse = () => {
    setCourseForm({ title: '', description: '', content: '' });
    setCourseModal('add');
  };
  const openEditCourse = (c) => {
    setCourseForm({ title: c.title, description: c.description ?? '', content: c.content ?? '' });
    setCourseModal(c);
  };
  const saveCourse = async (e) => {
    e.preventDefault();
    setCourseSubmitting(true);
    try {
      if (courseModal === 'add') {
        await addDoc(collection(db, 'courses'), {
          ...courseForm,
          createdBy: currentUser.email,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'courses', courseModal.id), {
          title: courseForm.title,
          description: courseForm.description,
          content: courseForm.content,
        });
      }
      setCourseModal(null);
    } finally {
      setCourseSubmitting(false);
    }
  };
  const deleteCourse = async (id) => {
    if (!window.confirm('Delete this course and all its homeworks?')) return;
    const hwSnap = await getDocs(query(collection(db, 'homeworks'), where('courseId', '==', id)));
    await Promise.all(hwSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'courses', id));
    if (selectedCourseId === id) setSelectedCourseId('');
  };

  /* ── homework CRUD ── */
  const resetQBuilder = () => { setQForm(DEFAULT_Q); setShowQForm(false); setEditQIdx(null); };

  const openAddHw = () => {
    setHwForm({ title: '', description: '', dueDate: '', questions: [] });
    resetQBuilder();
    setHwModal('add');
  };
  const openEditHw = (hw) => {
    const due = hw.dueDate?.toDate
      ? hw.dueDate.toDate().toISOString().slice(0, 10)
      : (hw.dueDate || '');
    setHwForm({
      title: hw.title,
      description: hw.description || '',
      dueDate: due,
      questions: hw.questions || [],
    });
    resetQBuilder();
    setHwModal(hw);
  };
  const saveHw = async (e) => {
    e.preventDefault();
    setHwSubmitting(true);
    try {
      const payload = {
        title: hwForm.title,
        description: hwForm.description,
        dueDate: hwForm.dueDate ? new Date(hwForm.dueDate) : null,
        questions: hwForm.questions,
      };
      if (hwModal === 'add') {
        await addDoc(collection(db, 'homeworks'), {
          ...payload,
          courseId: selectedCourseId,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'homeworks', hwModal.id), payload);
      }
      setHwModal(null);
    } finally {
      setHwSubmitting(false);
    }
  };
  const deleteHw = async (id) => {
    if (!window.confirm('Delete this homework?')) return;
    await deleteDoc(doc(db, 'homeworks', id));
  };

  /* ── question builder ── */
  const handleQTypeChange = (type) => {
    setQForm({ ...DEFAULT_Q, type, question: qForm.question, points: qForm.points });
  };

  const addOrUpdateQuestion = () => {
    if (!qForm.question.trim()) return;
    const q = {
      id: editQIdx !== null ? hwForm.questions[editQIdx].id : `q-${Date.now()}`,
      type: qForm.type,
      question: qForm.question.trim(),
      ...(qForm.type === 'multiple_choice' && {
        options: qForm.options.map((o) => o.trim()).filter(Boolean),
      }),
      ...(qForm.type !== 'manual_text' && { correctAnswer: qForm.correctAnswer }),
      ...(qForm.explanation && { explanation: qForm.explanation.trim() }),
      points: Number(qForm.points) || 1,
    };

    if (editQIdx !== null) {
      setHwForm((p) => ({
        ...p,
        questions: p.questions.map((qq, i) => (i === editQIdx ? q : qq)),
      }));
      setEditQIdx(null);
    } else {
      setHwForm((p) => ({ ...p, questions: [...p.questions, q] }));
    }
    setQForm(DEFAULT_Q);
    setShowQForm(false);
  };

  const deleteQuestion = (idx) => {
    setHwForm((p) => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }));
  };

  const startEditQ = (idx) => {
    const q = hwForm.questions[idx];
    const opts = q.options?.length
      ? [...q.options, '', '', '', ''].slice(0, 4)
      : ['', '', '', ''];
    setQForm({
      type: q.type,
      question: q.question,
      options: opts,
      correctAnswer: q.correctAnswer ?? '',
      explanation: q.explanation || '',
      points: q.points || 1,
    });
    setEditQIdx(idx);
    setShowQForm(true);
  };

  /* ── save review ── */
  const openReview = (sub) => {
    setReviewForm({ teacherScore: '', comment: '' });
    setReviewModal(sub);
  };

  const saveReview = async (e) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      await updateDoc(doc(db, 'submissions', reviewModal.id), {
        teacherScore:  Number(reviewForm.teacherScore) || 0,
        teacherComment: reviewForm.comment,
        status:        'reviewed',
        reviewedAt:    serverTimestamp(),
        reviewedBy:    currentUser.email,
      });
      setReviewModal(null);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return null;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500">{currentUser?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Courses',    value: courses.length, icon: BookOpen,  color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Total Users',      value: '—',            icon: Users,     color: 'bg-blue-50 text-blue-600'       },
            { label: 'Active Sessions',  value: '—',            icon: BarChart3, color: 'bg-violet-50 text-violet-600'  },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-2xl font-semibold text-slate-900">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── COURSES ── */}
      {activeTab === 'Courses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
            <Button size="sm" onClick={openAddCourse}>
              <Plus className="h-4 w-4" /> Add Course
            </Button>
          </div>

          {coursesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-16 text-center">
              <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm font-medium">No courses yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {courses.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{c.title}</p>
                      {c.description && <p className="text-sm text-slate-500 truncate">{c.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setSelectedCourseId(c.id); setActiveTab('Homeworks'); }}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 rounded-md px-2 py-1"
                      >
                        <ClipboardList className="h-3.5 w-3.5" /> Homeworks
                      </button>
                      <button onClick={() => openEditCourse(c)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteCourse(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HOMEWORKS ── */}
      {activeTab === 'Homeworks' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                {selectedCourse && (
                  <button onClick={() => setSelectedCourseId('')} className="text-slate-400 hover:text-slate-700">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="flex-1">
                  <Label htmlFor="course-select" className="text-xs text-slate-500 mb-1 block">Select Course</Label>
                  <select
                    id="course-select"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">— Choose a course —</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedCourseId && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{selectedCourse?.title}</p>
                  <p className="text-xs text-slate-500">{homeworks.length} homework{homeworks.length !== 1 ? 's' : ''}</p>
                </div>
                <Button size="sm" onClick={openAddHw}>
                  <Plus className="h-4 w-4" /> Add Homework
                </Button>
              </div>

              {hwLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : homeworks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-16 text-center">
                  <ClipboardList className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm font-medium">No homeworks yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {homeworks.map((hw, i) => (
                    <Card key={hw.id}>
                      <CardContent className="flex items-center justify-between gap-4 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900 truncate">{hw.title}</p>
                              {hw.questions?.length > 0 && (
                                <span className="text-xs text-slate-400 shrink-0">
                                  {hw.questions.length}q
                                </span>
                              )}
                            </div>
                            {hw.description && (
                              <p className="text-sm text-slate-500 truncate">{hw.description}</p>
                            )}
                            {hw.dueDate && (
                              <p className="text-xs text-slate-400 mt-0.5">Due {formatDate(hw.dueDate)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openEditHw(hw)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteHw(hw.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {!selectedCourseId && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-16 text-center">
              <BookOpen className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm font-medium">Select a course above to manage its homeworks</p>
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWS ── */}
      {activeTab === 'Reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {pendingReviews.length} pending written answer{pendingReviews.length !== 1 ? 's' : ''}
            </p>
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : pendingReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-16 text-center">
              <ClipboardList className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm font-medium">No pending reviews</p>
              <p className="text-xs text-slate-400 mt-1">All written answers have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingReviews.map((sub) => {
                const manualAnswers = (sub.answers || []).filter((a) => a.questionType === 'manual_text');
                const maxPts = manualAnswers.reduce((s, a) => s + (a.points || 1), 0);
                return (
                  <Card key={sub.id}>
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 truncate">{sub.hwTitle || 'Homework'}</p>
                          <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                            {manualAnswers.length} written · {maxPts}pts
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 truncate">{sub.userEmail || sub.userId}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Auto: {sub.score}/{sub.autoTotal} · Submitted {formatDate(sub.submittedAt)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => openReview(sub)}>
                        Review
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── COURSE MODAL ── */}
      {courseModal && (
        <Modal
          title={courseModal === 'add' ? 'Add Course' : 'Edit Course'}
          onClose={() => setCourseModal(null)}
          wide
        >
          <form onSubmit={saveCourse} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-title">Title</Label>
                <Input
                  id="c-title"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Course title"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-desc">Short description <span className="text-slate-400 font-normal">(shown on card)</span></Label>
                <Input
                  id="c-desc"
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="One-line summary"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Course content <span className="text-slate-400 font-normal">(supports headings, tables, code, lists…)</span></Label>
              <RichTextEditor
                key={courseModal === 'add' ? 'new' : courseModal.id}
                content={courseForm.content}
                onChange={(html) => setCourseForm((p) => ({ ...p, content: html }))}
                placeholder="Write the full course material here…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCourseModal(null)}>Cancel</Button>
              <Button type="submit" disabled={courseSubmitting}>
                {courseSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── HOMEWORK MODAL ── */}
      {hwModal && (
        <Modal
          title={hwModal === 'add' ? 'Add Homework' : 'Edit Homework'}
          onClose={() => setHwModal(null)}
          wide
        >
          <form onSubmit={saveHw} className="space-y-5">
            {/* Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="hw-title">Title</Label>
                <Input
                  id="hw-title"
                  value={hwForm.title}
                  onChange={(e) => setHwForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Homework title"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hw-due">Due Date</Label>
                <Input
                  id="hw-due"
                  type="date"
                  value={hwForm.dueDate}
                  onChange={(e) => setHwForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hw-desc">Description</Label>
              <textarea
                id="hw-desc"
                value={hwForm.description}
                onChange={(e) => setHwForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Instructions or details"
                rows={2}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 resize-none"
              />
            </div>

            {/* ── Questions ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-900">
                  Questions <span className="text-slate-400 font-normal ml-1">({hwForm.questions.length})</span>
                </Label>
                {!showQForm && (
                  <button
                    type="button"
                    onClick={() => { setQForm(DEFAULT_Q); setEditQIdx(null); setShowQForm(true); }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md px-2.5 py-1.5 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Question
                  </button>
                )}
              </div>

              {/* Question list */}
              {hwForm.questions.length > 0 && (
                <div className="space-y-2">
                  {hwForm.questions.map((q, idx) => (
                    <div key={q.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="flex h-5 w-5 shrink-0 mt-0.5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[q.type]}`}>
                            {Q_TYPES.find((t) => t.value === q.type)?.label}
                          </span>
                          <span className="text-xs text-slate-400">{q.points || 1}pt</span>
                        </div>
                        <p className="text-sm text-slate-700 truncate">{q.question}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditQ(idx)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline question form */}
              {showQForm && (
                <div className="rounded-lg border border-slate-300 bg-white p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {editQIdx !== null ? 'Edit Question' : 'New Question'}
                  </p>

                  {/* Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <select
                      value={qForm.type}
                      onChange={(e) => handleQTypeChange(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {Q_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Question text */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Question</Label>
                    <textarea
                      value={qForm.question}
                      onChange={(e) => setQForm((p) => ({ ...p, question: e.target.value }))}
                      placeholder="Enter the question…"
                      rows={2}
                      className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 resize-none"
                    />
                  </div>

                  {/* Multiple choice: options + correct */}
                  {qForm.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Options — select the correct one</Label>
                      <div className="space-y-1.5">
                        {qForm.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="q-correct"
                              checked={qForm.correctAnswer === opt && opt.trim() !== ''}
                              onChange={() => setQForm((p) => ({ ...p, correctAnswer: opt }))}
                              disabled={!opt.trim()}
                              className="accent-slate-900 shrink-0"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...qForm.options];
                                newOpts[i] = e.target.value;
                                const newCorrect =
                                  qForm.correctAnswer === opt ? e.target.value : qForm.correctAnswer;
                                setQForm((p) => ({ ...p, options: newOpts, correctAnswer: newCorrect }));
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </label>
                        ))}
                        {qForm.correctAnswer && (
                          <p className="text-xs text-emerald-600 pl-6">✓ Correct: {qForm.correctAnswer}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Short answer: correct */}
                  {qForm.type === 'short_answer' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Correct Answer</Label>
                      <Input
                        value={qForm.correctAnswer}
                        onChange={(e) => setQForm((p) => ({ ...p, correctAnswer: e.target.value }))}
                        placeholder="e.g. 8"
                      />
                    </div>
                  )}

                  {/* True / False: correct */}
                  {qForm.type === 'true_false' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Correct Answer</Label>
                      <div className="flex gap-2">
                        {['true', 'false'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setQForm((p) => ({ ...p, correctAnswer: v }))}
                            className={`flex-1 rounded-md border py-2 text-sm font-medium capitalize transition-colors ${
                              qForm.correctAnswer === v
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 text-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {v === 'true' ? 'True' : 'False'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation (auto-check types only) */}
                  {qForm.type !== 'manual_text' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Explanation <span className="text-slate-400 font-normal">(optional — shown after answer)</span>
                      </Label>
                      <Input
                        value={qForm.explanation}
                        onChange={(e) => setQForm((p) => ({ ...p, explanation: e.target.value }))}
                        placeholder="Why is this the correct answer?"
                      />
                    </div>
                  )}

                  {/* Points */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Points</Label>
                    <Input
                      type="number"
                      min="1"
                      value={qForm.points}
                      onChange={(e) => setQForm((p) => ({ ...p, points: e.target.value }))}
                      className="w-24"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button type="button" size="sm" onClick={addOrUpdateQuestion}>
                      {editQIdx !== null ? 'Update' : 'Add'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowQForm(false); setEditQIdx(null); setQForm(DEFAULT_Q); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setHwModal(null)}>Cancel</Button>
              <Button type="submit" disabled={hwSubmitting}>
                {hwSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── REVIEW MODAL ── */}
      {reviewModal && (
        <Modal title="Review Written Answers" onClose={() => setReviewModal(null)} wide>
          <div className="space-y-5">
            {/* Student + homework info */}
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm space-y-0.5">
              <p className="font-medium text-slate-900">{reviewModal.hwTitle}</p>
              <p className="text-slate-500">{reviewModal.userEmail}</p>
              <p className="text-xs text-slate-400">Auto-check: {reviewModal.score} / {reviewModal.autoTotal} pts</p>
            </div>

            {/* Written answers */}
            <div className="space-y-3">
              {(reviewModal.answers || [])
                .filter((a) => a.questionType === 'manual_text')
                .map((a, i) => (
                  <div key={a.questionId} className="rounded-lg border border-slate-200 p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Question {i + 1} · {a.points || 1} pt{(a.points || 1) !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm font-medium text-slate-900">{a.questionText}</p>
                    <div className="bg-slate-50 rounded-md px-3 py-2 text-sm text-slate-700">
                      {a.answer || <em className="text-slate-400">No answer given</em>}
                    </div>
                  </div>
                ))}
            </div>

            {/* Scoring form */}
            <form onSubmit={saveReview} className="space-y-3 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="teacher-score">
                    Teacher Score
                    <span className="text-slate-400 font-normal ml-1">
                      (max {(reviewModal.answers || []).filter((a) => a.questionType === 'manual_text').reduce((s, a) => s + (a.points || 1), 0)} pts)
                    </span>
                  </Label>
                  <Input
                    id="teacher-score"
                    type="number"
                    min="0"
                    value={reviewForm.teacherScore}
                    onChange={(e) => setReviewForm((p) => ({ ...p, teacherScore: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher-comment">Comment <span className="text-slate-400 font-normal">(optional)</span></Label>
                <textarea
                  id="teacher-comment"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                  placeholder="Feedback for the student…"
                  rows={2}
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setReviewModal(null)}>Cancel</Button>
                <Button type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as Reviewed'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

    </main>
  );
};

export default AdminPage;
