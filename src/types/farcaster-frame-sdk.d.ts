declare module '@farcaster/frame-sdk' {
  export const sdk: {
    readonly context: Promise<{
      user?: {
        fid: number;
        username?: string;
        displayName?: string;
        pfpUrl?: string;
      };
    } | undefined>;
    actions: {
      ready(): void | Promise<void>;
    };
  };
  export const frameHost: unknown;
  const _default: typeof sdk;
  export default _default;
}
