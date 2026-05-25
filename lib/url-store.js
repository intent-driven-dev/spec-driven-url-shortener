'use strict';

const fs = require('fs/promises');
const path = require('path');

const EXPIRATION_DAYS = 90;
const EXPIRATION_WINDOW_MS = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

function normalizeCreatedAt(createdAt) {
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function normalizeRecord(value) {
  if (typeof value === 'string') {
    return {
      longUrl: value,
      createdAt: null,
    };
  }

  if (value && typeof value === 'object' && typeof value.longUrl === 'string') {
    return {
      longUrl: value.longUrl,
      createdAt: normalizeCreatedAt(value.createdAt),
    };
  }

  return null;
}

function isRecordExpired(record, now = Date.now()) {
  if (!record || typeof record.longUrl !== 'string') {
    return true;
  }

  if (!record.createdAt) {
    return true;
  }

  const createdAtMs = Date.parse(record.createdAt);
  if (Number.isNaN(createdAtMs)) {
    return true;
  }

  return now - createdAtMs >= EXPIRATION_WINDOW_MS;
}

class UrlStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.records = new Map();
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      if (!raw.trim()) {
        this.records.clear();
        return;
      }

      const parsed = JSON.parse(raw);
      this.records.clear();

      if (parsed && typeof parsed === 'object') {
        for (const [code, value] of Object.entries(parsed)) {
          const record = normalizeRecord(value);
          if (typeof code === 'string' && record) {
            this.records.set(code, record);
          }
        }
      }
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        this.records.clear();
        return;
      }

      throw error;
    }
  }

  get(code) {
    const record = this.records.get(code);
    return record ? record.longUrl : null;
  }

  getRecord(code) {
    return this.records.get(code) || null;
  }

  has(code) {
    return this.records.has(code);
  }

  async reserve(code, longUrl, createdAt = new Date().toISOString()) {
    if (this.records.has(code)) {
      return false;
    }

    this.records.set(code, {
      longUrl,
      createdAt: normalizeCreatedAt(createdAt) || new Date().toISOString(),
    });
    await this.save();
    return true;
  }

  async deleteExpiredRecords(now = Date.now()) {
    let deletedCount = 0;

    for (const [code, record] of this.records.entries()) {
      if (isRecordExpired(record, now)) {
        this.records.delete(code);
        deletedCount += 1;
      }
    }

    if (deletedCount > 0) {
      await this.save();
    }

    return deletedCount;
  }

  async save() {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    const tempFile = path.join(
      dir,
      `${path.basename(this.filePath)}.${process.pid}.${Date.now()}.tmp`,
    );

    const data = JSON.stringify(Object.fromEntries(this.records), null, 2);
    await fs.writeFile(tempFile, `${data}\n`, 'utf8');
    await fs.rename(tempFile, this.filePath);
  }
}

module.exports = {
  EXPIRATION_DAYS,
  EXPIRATION_WINDOW_MS,
  UrlStore,
  isRecordExpired,
  normalizeCreatedAt,
  normalizeRecord,
};
