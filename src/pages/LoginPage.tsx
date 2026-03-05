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
      navigate('/routine-input');
    }
  }, [isReady, user, navigate]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Farcaster...</p>
        </div>
      </div>
    );
  }

  // If running outside Farcaster, show alternative login
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <h2 className="text-3xl font-bold text-center">Welcome to AI Timetable</h2>
          <p className="text-center text-gray-600">
            To use this app, please open it inside Farcaster or
            sign in with your Farcaster account.
          </p>
          <button
            onClick={() => window.open('https://farcaster.xyz', '_blank')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
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