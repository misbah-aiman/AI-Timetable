import React, { createContext, useContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';

interface FarcasterContextType {
  isReady: boolean;
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  error?: Error;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isReady: false,
});

export const useFarcaster = () => useContext(FarcasterContext);

export const FarcasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<FarcasterContextType>({ isReady: false });

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        // Get the Farcaster context (user info)
        const fcContext = await sdk.context;
        
        if (fcContext?.user) {
          setContext({
            isReady: true,
            user: {
              fid: fcContext.user.fid,
              username: fcContext.user.username,
              displayName: fcContext.user.displayName,
              pfpUrl: fcContext.user.pfpUrl,
            },
          });
        } else {
          setContext({ isReady: true }); // No user context (running outside Farcaster)
        }
      } catch (error) {
        setContext({ 
          isReady: true, 
          error: error instanceof Error ? error : new Error('Unknown error') 
        });
      }
    };

    initFarcaster();
  }, []);

  return (
    <FarcasterContext.Provider value={context}>
      {children}
    </FarcasterContext.Provider>
  );
};