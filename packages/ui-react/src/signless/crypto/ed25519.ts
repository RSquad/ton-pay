const ALGORITHM = "Ed25519";

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0);
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(ALGORITHM, true, [
    "sign",
    "verify",
  ]);

  const privateKeyBuffer = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );
  const publicKeyBuffer = await crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );

  return {
    publicKey: arrayBufferToUint8Array(publicKeyBuffer),
    privateKey: arrayBufferToUint8Array(privateKeyBuffer),
  };
}

export async function signMessage(
  privateKey: Uint8Array,
  message: Uint8Array
): Promise<Uint8Array> {
  const importedKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKey as unknown as BufferSource,
    ALGORITHM,
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(ALGORITHM, importedKey, message as unknown as BufferSource);
  return arrayBufferToUint8Array(signature);
}

export async function verifySignlessSignature(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array
): Promise<boolean> {
  const importedKey = await crypto.subtle.importKey(
    "spki",
    publicKey as unknown as BufferSource,
    ALGORITHM,
    false,
    ["verify"]
  );

  return crypto.subtle.verify(ALGORITHM, importedKey, signature as unknown as BufferSource, message as unknown as BufferSource);
}

export { uint8ArrayToHex, hexToUint8Array };


