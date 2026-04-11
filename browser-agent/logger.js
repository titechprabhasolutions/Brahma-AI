export class Logger {
  constructor({ debug = false } = {}) {
    this.debugEnabled = debug;
    this.logs = [];
  }

  setDebug(enabled) {
    this.debugEnabled = !!enabled;
  }

  _push(level, message, meta = {}) {
    const entry = {
      level,
      message: String(message || ''),
      meta,
      ts: Date.now(),
    };
    this.logs.push(entry);
    if (this.logs.length > 500) {
      this.logs.shift();
    }
    if (this.debugEnabled || level !== 'debug') {
      const prefix = level.toUpperCase();
      // eslint-disable-next-line no-console
      console.log(`[${prefix}]`, entry.message);
    }
    return entry;
  }

  info(message, meta) {
    return this._push('info', message, meta);
  }

  debug(message, meta) {
    return this._push('debug', message, meta);
  }

  warn(message, meta) {
    return this._push('warn', message, meta);
  }

  error(message, meta) {
    return this._push('error', message, meta);
  }
}
