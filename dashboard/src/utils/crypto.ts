/**
 * Ed25519 cryptographic utilities for request signing
 * Uses @noble/ed25519 for browser-compatible Ed25519 operations
 */

import * as ed from '@noble/ed25519';

// Storage keys for persisting identity
const PRIVATE_KEY_STORAGE_KEY = 'mycelial_ed25519_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'mycelial_ed25519_public_key';

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface SignedRequest {
  signature: string;
  publicKey: string;
  timestamp: number;
  nonce: string;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return bytesToHex(array);
}

/**
 * Generate a new Ed25519 key pair
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKey };
}

/**
 * Get or create a persistent key pair from localStorage
 */
export async function getOrCreateKeyPair(): Promise<KeyPair> {
  try {
    const storedPrivate = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    const storedPublic = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);

    if (storedPrivate && storedPublic) {
      return {
        privateKey: hexToBytes(storedPrivate),
        publicKey: hexToBytes(storedPublic),
      };
    }
  } catch (e) {
    console.warn('Failed to load stored keys:', e);
  }

  // Generate new keys
  const keyPair = await generateKeyPair();

  // Store for persistence
  try {
    localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, bytesToHex(keyPair.privateKey));
    localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, bytesToHex(keyPair.publicKey));
  } catch (e) {
    console.warn('Failed to store keys:', e);
  }

  return keyPair;
}

/**
 * Clear stored keys (useful for identity reset)
 */
export function clearStoredKeys(): void {
  localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
  localStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
}

/**
 * Get the public key as hex string (peer ID)
 */
export async function getPeerId(): Promise<string> {
  const keyPair = await getOrCreateKeyPair();
  return bytesToHex(keyPair.publicKey);
}

/**
 * Sign a message with the private key
 */
export async function signMessage(message: string | Uint8Array): Promise<Uint8Array> {
  const keyPair = await getOrCreateKeyPair();
  const messageBytes = typeof message === 'string'
    ? new TextEncoder().encode(message)
    : message;
  return ed.signAsync(messageBytes, keyPair.privateKey);
}

/**
 * Verify a signature
 */
export async function verifySignature(
  message: string | Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  const messageBytes = typeof message === 'string'
    ? new TextEncoder().encode(message)
    : message;
  return ed.verifyAsync(signature, messageBytes, publicKey);
}

/**
 * Create signed request headers for API authentication
 *
 * The signature covers: method + url + timestamp + nonce + body
 * This prevents replay attacks and ensures request integrity
 */
export async function createSignedHeaders(
  method: string,
  url: string,
  body?: string
): Promise<Record<string, string>> {
  const keyPair = await getOrCreateKeyPair();
  const timestamp = Date.now();
  const nonce = generateNonce();

  // Create canonical message to sign
  const canonicalMessage = [
    method.toUpperCase(),
    url,
    timestamp.toString(),
    nonce,
    body || '',
  ].join('\n');

  const signature = await signMessage(canonicalMessage);

  return {
    'X-Public-Key': bytesToHex(keyPair.publicKey),
    'X-Signature': bytesToHex(signature),
    'X-Timestamp': timestamp.toString(),
    'X-Nonce': nonce,
  };
}

/**
 * Create a signed fetch wrapper that automatically adds authentication headers
 */
export async function signedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || 'GET';
  const body = typeof options.body === 'string' ? options.body : undefined;

  const signedHeaders = await createSignedHeaders(method, url, body);

  const headers = new Headers(options.headers);
  Object.entries(signedHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Add CORS-friendly headers
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
    // CORS configuration
    mode: 'cors',
    credentials: 'omit', // Don't send cookies for CORS
  });
}

/**
 * Export public key for sharing with other peers
 */
export async function exportPublicKey(): Promise<string> {
  const keyPair = await getOrCreateKeyPair();
  return bytesToHex(keyPair.publicKey);
}

/**
 * Check if keys exist in storage
 */
export function hasStoredKeys(): boolean {
  return !!(
    localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) &&
    localStorage.getItem(PUBLIC_KEY_STORAGE_KEY)
  );
}
