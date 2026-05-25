'use strict';

const fs = require('fs/promises');
const path = require('path');

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
        for (const [code, longUrl] of Object.entries(parsed)) {
          if (typeof code === 'string' && typeof longUrl === 'string') {
            this.records.set(code, longUrl);
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
    return this.records.get(code) || null;
  }

  has(code) {
    return this.records.has(code);
  }

  async reserve(code, longUrl) {
    if (this.records.has(code)) {
      return false;
    }

    this.records.set(code, longUrl);
    await this.save();
    return true;
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
  UrlStore,
};
