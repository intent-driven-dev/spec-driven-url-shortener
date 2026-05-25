'use strict';

const { EXPIRATION_DAYS } = require('./url-store');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getNextUtcMidnightDelay(now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  const nextMidnightMs = Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );

  return Math.max(0, nextMidnightMs - current.getTime());
}

async function runExpirationCleanup(store, now = Date.now()) {
  return store.deleteExpiredRecords(now);
}

function scheduleDailyUtcCleanup(
  store,
  {
    now = () => new Date(),
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    onError = () => {},
  } = {},
) {
  let cancelled = false;
  let timer = null;

  const scheduleNextRun = () => {
    if (cancelled) {
      return;
    }

    const delay = getNextUtcMidnightDelay(now());
    timer = setTimeoutFn(() => {
      void (async () => {
        try {
          await runExpirationCleanup(store);
        } catch (error) {
          onError(error);
        } finally {
          scheduleNextRun();
        }
      })();
    }, delay);
  };

  scheduleNextRun();

  return {
    cancel() {
      cancelled = true;
      if (timer !== null) {
        clearTimeoutFn(timer);
      }
    },
  };
}

module.exports = {
  DAY_IN_MS,
  EXPIRATION_DAYS,
  getNextUtcMidnightDelay,
  runExpirationCleanup,
  scheduleDailyUtcCleanup,
};
