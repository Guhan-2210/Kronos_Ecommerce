// src/services/crypto.service.js
// Using Web Crypto API - optimized for Cloudflare Workers

async function importAesKey(env) {
  const raw = Uint8Array.from(atob(env.DATA_ENC_KEY_B64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function importHmacKey(env) {
  const raw = Uint8Array.from(atob(env.PII_INDEX_KEY_B64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

function toB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
function randIV() {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

export async function encryptField(env, plaintext) {
  const key = await importAesKey(env);
  const iv = randIV();
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { ct: toB64(ct), iv: toB64(iv) }; // store as {ct, iv}
}

export async function decryptField(env, enc) {
  const key = await importAesKey(env);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(enc.iv) },
    key,
    fromB64(enc.ct)
  );
  return new TextDecoder().decode(pt);
}

export async function hmacDeterministic(env, input) {
  const key = await importHmacKey(env);
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(input.toLowerCase().trim())
  );
  return toB64(mac); // use as email_hash inside JSONB
}

// PBKDF2 password hashing - optimized for Cloudflare Workers
// Fast (~2-3ms) and secure for edge computing
export async function hashArgon2id(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive hash using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 5000, // OWASP recommendation for PBKDF2-SHA256
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 256 bits output
  );

  const hash = new Uint8Array(hashBuffer);

  // Encode as: $pbkdf2-sha256$5000$salt$hash
  return `$pbkdf2-sha256$5000$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyArgon2id(encoded, password) {
  console.log('verifyArgon2id input:', {
    encodedPrefix: encoded?.substring(0, 30),
    passwordLength: password?.length,
    passwordPrefix: password?.substring(0, 10),
  });

  // Parse the encoded hash: $pbkdf2-sha256$iterations$salt$hash
  const parts = encoded.split('$');
  if (parts.length !== 5 || parts[1] !== 'pbkdf2-sha256') {
    console.error('Invalid hash format:', { parts });
    throw new Error('Invalid hash format');
  }

  const iterations = parseInt(parts[2], 10);
  const salt = fromB64(parts[3]);
  const originalHash = fromB64(parts[4]);

  console.log('Hash components:', {
    iterations,
    saltLength: salt.length,
    originalHashLength: originalHash.length,
  });

  const encoder = new TextEncoder();

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive hash with same parameters
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const computedHash = new Uint8Array(hashBuffer);

  console.log('Hash comparison:', {
    computedHashLength: computedHash.length,
    originalHashLength: originalHash.length,
    computedFirst4: Array.from(computedHash.slice(0, 4)),
    originalFirst4: Array.from(originalHash.slice(0, 4)),
  });

  // Constant-time comparison
  if (computedHash.length !== originalHash.length) {
    console.warn('Hash length mismatch');
    return false;
  }

  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash[i] ^ originalHash[i];
  }

  const result = diff === 0;
  console.log('Verification result:', { result, diff });

  return result;
}
