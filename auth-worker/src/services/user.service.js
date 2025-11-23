// src/services/user.service.js
import { encryptField, hashArgon2id, verifyArgon2id, hmacDeterministic } from './crypto.service.js';
import { insertUser, findUserByEmailHash } from '../models/user.model.js';

export async function registerUser(env, input) {
  const emailHash = await hmacDeterministic(env, input.email);
  const phoneHash = await hmacDeterministic(env, input.phone);

  const encName = await encryptField(env, input.name);
  const encEmail = await encryptField(env, input.email);
  const encPhone = await encryptField(env, input.phone);
  const encAddress = await encryptField(env, JSON.stringify(input.address));
  const pwd = await hashArgon2id(input.password);

  const existing = await findUserByEmailHash(env, emailHash);
  if (existing) throw new Error('email_exists');

  const userId = crypto.randomUUID();

  const user_data = {
    name: encName,
    email: encEmail,
    phone: encPhone,
    address: encAddress,
    email_hash: emailHash,
    phone_hash: phoneHash,
    password: pwd,
  };

  await insertUser(env, userId, user_data);
  return { id: userId };
}

export async function verifyUserPassword(env, email, password) {
  const emailHash = await hmacDeterministic(env, email);
  const user = await findUserByEmailHash(env, emailHash);
  if (!user) return null;
  const ok = await verifyArgon2id(user.user_data.password, password);
  return ok ? user : null;
}
