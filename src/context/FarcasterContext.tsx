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
    const FARCASTER_CONTEXT_TIMEOUT_MS = 3000;

    const initFarcaster = async () => {
      try {
        // Outside the Farcaster host, sdk.context may never settle — cap wait so email login still works.
        const fcContext = await Promise.race([
          sdk.context,
          new Promise<undefined>((resolve) =>
            setTimeout(() => resolve(undefined), FARCASTER_CONTEXT_TIMEOUT_MS)
          ),
        ]);

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
          setContext({ isReady: true });
        }
      } catch (error) {
        setContext({
          isReady: true,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      } finally {
        try {
          sdk.actions.ready();
        } catch {
          // No host when running in a normal browser
        }
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