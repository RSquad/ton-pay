import type { SignlessVaultData, SignlessAuthMethod } from "./types";
import type { EncryptedKeyVault, WebAuthnCredentialInfo } from "./crypto";

const DEFAULT_STORAGE_KEY = "tonpay_signless_vault";

export class SignlessStorage {
  private storageKey: string;

  constructor(storageKey: string = DEFAULT_STORAGE_KEY) {
    this.storageKey = storageKey;
  }

  private getStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  async saveVault(
    walletAddress: string,
    vault: EncryptedKeyVault,
    authMethod: SignlessAuthMethod,
    webauthnCredential?: WebAuthnCredentialInfo
  ): Promise<void> {
    const storage = this.getStorage();
    if (!storage) return;

    const data: SignlessVaultData = {
      vault,
      authMethod,
      walletAddress,
      webauthnCredential,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const key = this.getStorageKeyForWallet(walletAddress);
    storage.setItem(key, JSON.stringify(data));
  }

  async loadVault(walletAddress: string): Promise<SignlessVaultData | null> {
    const storage = this.getStorage();
    if (!storage) return null;

    const key = this.getStorageKeyForWallet(walletAddress);
    const data = storage.getItem(key);

    if (!data) return null;

    try {
      return JSON.parse(data) as SignlessVaultData;
    } catch {
      return null;
    }
  }

  async deleteVault(walletAddress: string): Promise<void> {
    const storage = this.getStorage();
    if (!storage) return;

    const key = this.getStorageKeyForWallet(walletAddress);
    storage.removeItem(key);
  }

  async hasVault(walletAddress: string): Promise<boolean> {
    const vault = await this.loadVault(walletAddress);
    return vault !== null;
  }

  async updateVaultTimestamp(walletAddress: string): Promise<void> {
    const storage = this.getStorage();
    if (!storage) return;

    const vault = await this.loadVault(walletAddress);
    if (!vault) return;

    vault.updatedAt = Date.now();
    const key = this.getStorageKeyForWallet(walletAddress);
    storage.setItem(key, JSON.stringify(vault));
  }

  async getAllWalletsWithVaults(): Promise<string[]> {
    const storage = this.getStorage();
    if (!storage) return [];

    const wallets: string[] = [];
    const prefix = `${this.storageKey}_`;

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) {
        const walletAddress = key.slice(prefix.length);
        wallets.push(walletAddress);
      }
    }

    return wallets;
  }

  private getStorageKeyForWallet(walletAddress: string): string {
    return `${this.storageKey}_${walletAddress}`;
  }
}

export const signlessStorage = new SignlessStorage();


