// src/services/logging.service.js
export function log(level, msg, ctx = {}) {
  const entry = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...ctx,
  };
  console.log(JSON.stringify(entry));
}
