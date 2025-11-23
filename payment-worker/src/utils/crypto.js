/**
 * Crypto utilities for encrypting/decrypting sensitive data
 * Uses Web Crypto API available in Cloudflare Workers
 */

/**
 * Hash data using SHA-256 (for email, payer ID, etc.)
 * This is one-way hashing for privacy
 */
export async function hashData(data) {
  if (!data) return null;

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Encrypt sensitive data using AES-GCM
 * Industry standard for encrypting data at rest
 */
export async function encryptData(data, keyBase64) {
  if (!data) return null;

  try {
    // Decode the base64 key
    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));

    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));

    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer);

    // Combine IV and encrypted data
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedBase64, keyBase64) {
  if (!encryptedBase64) return null;

  try {
    // Decode the base64 key
    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));

    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decode the combined data
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    // Decode and parse
    const decoder = new TextDecoder();
    const decryptedString = decoder.decode(decryptedBuffer);

    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}
