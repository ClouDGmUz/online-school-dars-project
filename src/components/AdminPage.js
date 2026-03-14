import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, where, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Users, BookOpen, BarChart3, Plus, Pencil, Trash2, X, ClipboardList, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import RichTextEditor from './RichTextEditor';

/* ── small reusable modal ── */
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

/* ── tab bar ── */
const TABS = ['Overview', 'Courses', 'Homeworks'];

const AdminPage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');

  /* ── courses state ── */
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseModal, setCourseModal] = useState(null); // null | 'add' | course object
  const [courseForm, setCourseForm] = useState({ title: '', description: '', content: '' });
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  /* ── homeworks state ── */
  const [homeworks, setHomeworks] = useState([]);
  const [hwLoading, setHwLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [hwModal, setHwModal] = useState(null); // null | 'add' | hw object
  const [hwForm, setHwForm] = useState({ title: '', description: '', dueDate: '' });
  const [hwSubmitting, setHwSubmitting] = useState(false);

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

  /* ── load homeworks for selected course ── */
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
  const openAddCourse = () => { setCourseForm({ title: '', description: '', content: '' }); setCourseModal('add'); };
  const openEditCourse = (c) => { setCourseForm({ title: c.title, description: c.description ?? '', content: c.content ?? '' }); setCourseModal(c); };

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
        await updateDoc(doc(db, 'courses', courseModal.id), { title: courseForm.title, description: courseForm.description, content: courseForm.content });
      }
      setCourseModal(null);
    } finally {
      setCourseSubmitting(false);
    }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm('Delete this course and all its homeworks?')) return;
    // delete homeworks first
    const hwSnap = await getDocs(query(collection(db, 'homeworks'), where('courseId', '==', id)));
    await Promise.all(hwSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'courses', id));
    if (selectedCourseId === id) setSelectedCourseId('');
  };

  /* ── homework CRUD ── */
  const openAddHw = () => { setHwForm({ title: '', description: '', dueDate: '' }); setHwModal('add'); };
  const openEditHw = (hw) => {
    const due = hw.dueDate?.toDate ? hw.dueDate.toDate().toISOString().slice(0, 10) : (hw.dueDate || '');
    setHwForm({ title: hw.title, description: hw.description, dueDate: due });
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
            { label: 'Total Courses', value: courses.length, icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Total Users', value: '—', icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Active Sessions', value: '—', icon: BarChart3, color: 'bg-violet-50 text-violet-600' },
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
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
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
          {/* Course selector */}
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
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
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
                            <p className="font-medium text-slate-900 truncate">{hw.title}</p>
                            {hw.description && <p className="text-sm text-slate-500 truncate">{hw.description}</p>}
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
              <Label>Course content <span className="text-slate-400 font-normal">(full material — supports headings, tables, code, lists…)</span></Label>
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
        >
          <form onSubmit={saveHw} className="space-y-4">
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
              <Label htmlFor="hw-desc">Description</Label>
              <textarea
                id="hw-desc"
                value={hwForm.description}
                onChange={(e) => setHwForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Instructions or details"
                rows={3}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 resize-none"
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
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setHwModal(null)}>Cancel</Button>
              <Button type="submit" disabled={hwSubmitting}>
                {hwSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </main>
  );
};

export default AdminPage;
