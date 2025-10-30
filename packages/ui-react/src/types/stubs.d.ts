declare module "react" {
    export const useEffect: any;
    export const useState: any;
    export type CSSProperties = any;
    export type MouseEvent = any;
    export type ReactNode = any;
    const _default: any;
    export default _default;
}

declare module "react/jsx-runtime" {
    export const jsx: any;
    export const jsxs: any;
    export const Fragment: any;
    const _default: any;
    export default _default;
}

declare module "@tonconnect/ui-react" {
    export function useTonAddress(a?: any): string | null;
    export function useTonConnectModal(): { open: () => void };
    export function useTonConnectUI(): [{ disconnect: () => Promise<void>, onStatusChange: any, onModalStateChange: any, sendTransaction: any }];
    export function useTonWallet(): { account?: { address: string, chain?: any } } | null;
    export const TonConnectUIProvider: any;
}

declare module "@tonconnect/ui" {
    export const CHAIN: { TESTNET: any };
    export function toUserFriendlyAddress(a: string, isTestnet: boolean): string;
    export class TonConnectUI {
        constructor(opts: any);
        onStatusChange(cb: any): () => void;
        onModalStateChange(cb: any): () => void;
        openModal(): void;
        sendTransaction(req: any): Promise<any>;
        disconnect(): Promise<void>;
        account?: { address: string } | null;
    }
}

declare module "ton-helper" {
    export function shortenAddress(a: string): string;
}


