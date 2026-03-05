export * from './Button';
export * from './Input';
export * from './Card';
export * from './Modal';
export * from './Spinner';
export * from './Badge';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from '../../App';
import { sdk } from '@farcaster/frame-sdk';

// Initialize Farcaster Mini App
sdk.actions.ready()
  .then(() => {
    console.log('Farcaster Mini App initialized successfully');
  })
  .catch((error) => {
    console.error('Failed to initialize Farcaster Mini App:', error);
    // App will still work outside Farcaster
  });

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <typeof React.StrictMode>
    <App />
  </typeof React.StrictMode>
);
