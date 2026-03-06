import React, { useEffect } from 'react';
import { useFarcaster } from '../context/FarcasterContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { isReady, user } = useFarcaster();
  const navigate = useNavigate();

  useEffect(() => {
    if (isReady && user) {
      console.log('Logged in with Farcaster:', user);
      
      // Redirect to main app
      navigate('/routine');
    }
  }, [isReady, user, navigate]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          <p className="mt-4 text-primary-700">Loading Farcaster...</p>
        </div>
      </div>
    );
  }

  // If running outside Farcaster, show alternative login
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50 px-4">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-soft ring-1 ring-primary-200/60">
          <h2 className="text-center text-3xl font-bold text-primary-900">Welcome to AI Timetable</h2>
          <p className="text-center text-primary-700">
            To use this app, please open it inside Farcaster or
            sign in with your Farcaster account.
          </p>
          <button
            onClick={() => window.open('https://farcaster.xyz', '_blank')}
            className="w-full flex justify-center rounded-xl py-3 px-4 text-sm font-medium text-white shadow-md transition bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Open Farcaster
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Login;