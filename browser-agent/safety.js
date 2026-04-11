export class SafetyEngine {
  constructor({ allowlist = [], blocklist = [] } = {}) {
    this.allowlist = allowlist;
    this.blocklist = blocklist;
  }

  isAllowed(url) {
    try {
      const { hostname } = new URL(url);
      if (this.blocklist.some((entry) => hostname.endsWith(entry))) return false;
      if (!this.allowlist.length) return true;
      return this.allowlist.some((entry) => hostname.endsWith(entry));
    } catch {
      return false;
    }
  }
}
