export {};

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: <T = unknown>(args: {
        method: string;
        params?: T;
      }) => Promise<T>;
    };
  }
}
