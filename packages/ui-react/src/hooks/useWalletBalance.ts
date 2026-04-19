import * as React from 'react';

const TONCENTER_MAINNET = 'https://toncenter.com';
const TONCENTER_TESTNET = 'https://testnet.toncenter.com';

/** Estimated gas fees in TON */
const GAS_FEE_TON_TRANSFER = 0.05;
const GAS_FEE_JETTON_TRANSFER = 0.1;

function getToncenterEndpoint(network: 'mainnet' | 'testnet'): string {
  return network === 'testnet' ? TONCENTER_TESTNET : TONCENTER_MAINNET;
}

async function fetchTonBalance(
  address: string,
  network: 'mainnet' | 'testnet',
): Promise<number> {
  const endpoint = getToncenterEndpoint(network);
  const response = await fetch(
    `${endpoint}/api/v3/account?address=${encodeURIComponent(address)}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch TON balance: ${response.status}`);
  }
  const data = await response.json();
  const balanceNano = BigInt(data.balance || '0');
  return Number(balanceNano) / 1e9;
}

async function fetchJettonBalance(
  ownerAddress: string,
  jettonMasterAddress: string,
  network: 'mainnet' | 'testnet',
): Promise<number> {
  const endpoint = getToncenterEndpoint(network);
  const response = await fetch(
    `${endpoint}/api/v3/jetton/wallets?owner_address=${encodeURIComponent(
      ownerAddress,
    )}&jetton_address=${encodeURIComponent(jettonMasterAddress)}&limit=1`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch jetton balance: ${response.status}`);
  }
  const data = await response.json();
  const wallets = data.jetton_wallets || [];
  if (wallets.length === 0) {
    return 0;
  }
  const wallet = wallets[0];
  const rawBalance = wallet.balance || '0';
  // toncenter v3 returns `wallet.jetton` as the jetton master address STRING,
  // not an object — so `wallet.jetton?.decimals` is always undefined and the
  // fallback-to-9 branch always wins. That renders any jetton with decimals≠9
  // at the wrong magnitude (USDT, 6 decimals, shows 1000× smaller than reality
  // — a 20 USDT balance displays as 0.02 USDT).
  //
  // Decimals actually live in `data.metadata[masterAddr].token_info[0].extra
  // .decimals` as a string. We try that first, fall back to the legacy object
  // shape (future-proofing in case the response evolves), and finally to 9.
  let decimals = 9;
  const masterAddr =
    typeof wallet.jetton === 'string' ? wallet.jetton : null;
  const fromMetadata = masterAddr
    ? data?.metadata?.[masterAddr]?.token_info?.[0]?.extra?.decimals
    : undefined;
  if (fromMetadata != null) {
    const parsed = Number(fromMetadata);
    if (Number.isFinite(parsed)) decimals = parsed;
  } else if (typeof wallet.jetton?.decimals === 'number') {
    decimals = wallet.jetton.decimals;
  }
  return Number(BigInt(rawBalance)) / Math.pow(10, decimals);
}

export function getGasFee(asset: string): number {
  const isNativeTon =
    !asset || asset.toUpperCase() === 'TON' || asset === 'native';
  return isNativeTon ? GAS_FEE_TON_TRANSFER : GAS_FEE_JETTON_TRANSFER;
}

export interface UseWalletBalanceOptions {
  walletAddress?: string;
  asset?: string; // "TON" or jetton master address
  network?: 'mainnet' | 'testnet';
}

export interface WalletBalanceState {
  /** Balance of the payment token (TON or jetton) */
  balance: number | null;
  /** TON balance (always fetched, needed for gas) */
  tonBalance: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: (silent?: boolean) => Promise<void>;
}

export function useWalletBalance({
  walletAddress,
  asset = 'TON',
  network = 'mainnet',
}: UseWalletBalanceOptions): WalletBalanceState {
  const [balance, setBalance] = React.useState<number | null>(null);
  const [tonBalance, setTonBalance] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const isNativeTon = React.useMemo(() => {
    return !asset || asset.toUpperCase() === 'TON' || asset === 'native';
  }, [asset]);

  const fetchBalance = React.useCallback(
    async (silent?: boolean) => {
      if (!walletAddress) {
        setBalance(null);
        setTonBalance(null);
        return;
      }

      // Cancel previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      if (!silent) setIsLoading(true);
      setError(null);

      try {
        // Always fetch TON balance (needed for gas estimation)
        const tonBal = await fetchTonBalance(walletAddress, network);

        if (controller.signal.aborted) return;
        setTonBalance(tonBal);

        if (isNativeTon) {
          setBalance(tonBal);
        } else {
          // Fetch jetton balance
          const jettonBal = await fetchJettonBalance(
            walletAddress,
            asset,
            network,
          );
          if (controller.signal.aborted) return;
          setBalance(jettonBal);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg =
          err instanceof Error ? err.message : 'Failed to fetch balance';
        setError(msg);
        console.error('[useWalletBalance] Error:', err);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [walletAddress, asset, network, isNativeTon],
  );

  // Auto-fetch when walletAddress changes
  React.useEffect(() => {
    if (walletAddress) {
      fetchBalance();
    } else {
      setBalance(null);
      setTonBalance(null);
    }
  }, [walletAddress, asset, network]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return {
    balance,
    tonBalance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
