import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { BookOpen, ArrowRight, Loader2, GraduationCap } from 'lucide-react';

/* Palette for course cards — cycles by index */
const COLORS = [
  { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600' },
  { bg: 'bg-sky-500',    light: 'bg-sky-50',    text: 'text-sky-600'    },
  { bg: 'bg-emerald-500',light: 'bg-emerald-50',text: 'text-emerald-600'},
  { bg: 'bg-amber-500',  light: 'bg-amber-50',  text: 'text-amber-600'  },
  { bg: 'bg-rose-500',   light: 'bg-rose-50',   text: 'text-rose-600'   },
  { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600' },
];

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'courses'));
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setCourses(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">

      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
        </div>
        <p className="text-slate-500 ml-12">Browse and open any course to see its homework.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-24 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-600 font-semibold">No courses yet</p>
          <p className="text-sm text-slate-400 mt-1">Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, i) => {
            const color = COLORS[i % COLORS.length];
            return (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200"
              >
                {/* Color strip + icon */}
                <div className={`${color.bg} px-6 pt-6 pb-8 relative`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  {/* Decorative circle */}
                  <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-white/10" />
                  <div className="absolute right-8 bottom-2 h-12 w-12 rounded-full bg-white/10" />
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 px-6 py-5">
                  <h2 className="text-base font-semibold text-slate-900 leading-snug mb-1 group-hover:text-violet-600 transition-colors">
                    {course.title}
                  </h2>
                  {course.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {course.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${color.light} ${color.text}`}>
                      <BookOpen className="h-3 w-3" />
                      Course
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-slate-400 group-hover:text-slate-900 transition-colors">
                      Open <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default CoursesPage;
