const WEBAUTHN_RP_NAME = "TON Pay";
const WEBAUTHN_RP_ID_FALLBACK = "tonpay.io";
const STATIC_CHALLENGE = new Uint8Array([
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
  0x0e, 0x0f, 0x10,
]);

export interface WebAuthnCredentialInfo {
  credentialId: string;
  publicKey: string;
  transports?: AuthenticatorTransport[];
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | SharedArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function getRpId(): string {
  if (typeof window === "undefined") return WEBAUTHN_RP_ID_FALLBACK;
  return window.location.hostname || WEBAUTHN_RP_ID_FALLBACK;
}

export async function createWebAuthnCredential(
  walletAddress: string
): Promise<WebAuthnCredentialInfo> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn is not supported in this browser");
  }

  const userId = new TextEncoder().encode(walletAddress);

  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge: STATIC_CHALLENGE as unknown as BufferSource,
    rp: {
      name: WEBAUTHN_RP_NAME,
      id: getRpId(),
    },
    user: {
      id: userId,
      name: `TON Pay - ${walletAddress.slice(0, 8)}...`,
      displayName: "TON Pay Signless",
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    timeout: 60000,
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    attestation: "none",
  };

  const credential = (await navigator.credentials.create({
    publicKey: createOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Failed to create WebAuthn credential");
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    credentialId: arrayBufferToBase64Url(credential.rawId),
    publicKey: arrayBufferToBase64Url(response.getPublicKey?.() ?? new ArrayBuffer(0)),
    transports: response.getTransports?.() as AuthenticatorTransport[] | undefined,
  };
}

export async function getWebAuthnCredential(
  credentialInfo: WebAuthnCredentialInfo
): Promise<ArrayBuffer> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn is not supported in this browser");
  }

  const credentialId = base64UrlToArrayBuffer(credentialInfo.credentialId);

  const getOptions: PublicKeyCredentialRequestOptions = {
    challenge: STATIC_CHALLENGE as unknown as BufferSource,
    rpId: getRpId(),
    timeout: 60000,
    userVerification: "required",
    allowCredentials: [
      {
        type: "public-key",
        id: credentialId,
        transports: credentialInfo.transports,
      },
    ],
  };

  const assertion = (await navigator.credentials.get({
    publicKey: getOptions,
  })) as PublicKeyCredential;

  if (!assertion) {
    throw new Error("WebAuthn authentication failed");
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  return response.signature;
}

export async function deriveKeyFromWebAuthn(
  credentialInfo: WebAuthnCredentialInfo,
  salt: Uint8Array
): Promise<CryptoKey> {
  const signature = await getWebAuthnCredential(credentialInfo);
  const signatureBytes = new Uint8Array(signature);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    signatureBytes as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}


