import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { LogOut, Menu, X, GraduationCap, Shield, BookOpen, Trophy } from 'lucide-react';
import { isAdmin } from './AdminRoute';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Courses',     to: '/courses',      icon: BookOpen },
    { label: 'Leaderboard', to: '/leaderboard',  icon: Trophy   },
    ...(isAdmin(currentUser) ? [{ label: 'Admin', to: '/admin', icon: Shield }] : []),
  ];

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const Avatar = ({ size = 'h-8 w-8' }) =>
    currentUser?.photoURL ? (
      <img
        src={currentUser.photoURL}
        alt="avatar"
        referrerPolicy="no-referrer"
        className={`${size} rounded-full object-cover`}
      />
    ) : (
      <div className={`flex ${size} items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white`}>
        {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
      </div>
    );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0f172a]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2 font-semibold text-white">
          <div className="relative flex items-center justify-center p-1.5 rounded-lg bg-gradient-to-br from-brand-500 to-fuchsia-500 shadow-[0_0_15px_rgba(104,117,245,0.4)] group-hover:shadow-[0_0_20px_rgba(104,117,245,0.6)] transition-all">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Dars</span>
        </Link>

        {/* Desktop nav links */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-2">
            {navLinks.map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-300 ${
                  isActive(to)
                    ? 'bg-white/10 text-brand-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-4">
          {currentUser ? (
            <>
              {/* Avatar + email */}
              <div className="hidden sm:flex items-center gap-2">
                <Avatar />
                <span className="text-sm font-medium text-slate-300 max-w-[160px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:flex gap-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>

              {/* Mobile hamburger */}
              <button
                className="sm:hidden p-1.5 rounded-md text-slate-400 hover:bg-white/5"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/5">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-500/30 border-0">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && currentUser && (
        <div className="sm:hidden border-t border-white/10 bg-[#0f172a]/95 backdrop-blur-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5 mb-2">
            <Avatar />
            <span className="text-sm font-medium text-slate-200 truncate">
              {currentUser.displayName || currentUser.email}
            </span>
          </div>
          {navLinks.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive(to)
                  ? 'bg-white/10 text-brand-300'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </Link>
          ))}
          <button
            onClick={() => { logout(); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors mt-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
