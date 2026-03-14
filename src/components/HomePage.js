import React from 'react';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { currentUser } = useAuth();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">
        Welcome, {currentUser?.displayName || currentUser?.email || 'User'}!
      </h1>
      <p className="mt-2 text-slate-500">You have successfully logged in.</p>
    </main>
  );
};

export default HomePage;