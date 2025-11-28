const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

export interface EncryptedKeyVault {
  salt: string;
  iv: string;
  encryptedBlob: string;
  publicKey: string;
  version: number;
}

function arrayBufferToBase64(buffer: ArrayBuffer | SharedArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

export async function deriveKeyFromPin(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    pinData as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPrivateKey(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  pin: string
): Promise<EncryptedKeyVault> {
  const salt = generateSalt();
  const iv = generateIv();
  const derivedKey = await deriveKeyFromPin(pin, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    derivedKey,
    privateKey as unknown as BufferSource
  );

  return {
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    encryptedBlob: arrayBufferToBase64(encryptedBuffer),
    publicKey: arrayBufferToBase64(publicKey.buffer),
    version: 1,
  };
}

export async function decryptPrivateKey(
  vault: EncryptedKeyVault,
  pin: string
): Promise<Uint8Array> {
  const salt = new Uint8Array(base64ToArrayBuffer(vault.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(vault.iv));
  const encryptedBlob = base64ToArrayBuffer(vault.encryptedBlob);

  const derivedKey = await deriveKeyFromPin(pin, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      derivedKey,
      encryptedBlob
    );
    return new Uint8Array(decryptedBuffer);
  } catch {
    throw new Error("Invalid PIN or corrupted vault");
  }
}


