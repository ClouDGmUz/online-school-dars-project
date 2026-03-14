import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { LogOut, Menu, X, GraduationCap, Shield, BookOpen } from 'lucide-react';
import { isAdmin } from './AdminRoute';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Courses', to: '/courses', icon: BookOpen },
    ...(isAdmin(currentUser) ? [{ label: 'Admin', to: '/admin', icon: Shield }] : []),
  ];

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <GraduationCap className="h-6 w-6" />
          <span>Dars</span>
        </Link>

        {/* Desktop nav links */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              {/* Avatar + email */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
                <span className="text-sm text-slate-600 max-w-[160px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:flex gap-1.5">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>

              {/* Mobile hamburger */}
              <button
                className="sm:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && currentUser && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
              {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
            </div>
            <span className="text-sm text-slate-600 truncate">
              {currentUser.displayName || currentUser.email}
            </span>
          </div>
          {navLinks.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(to)
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </Link>
          ))}
          <button
            onClick={() => { logout(); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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
