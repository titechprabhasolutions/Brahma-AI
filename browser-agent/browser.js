import { normalizeUrl } from './utils.js';

export class BrowserController {
  constructor(profileManager, { logger }) {
    this.profileManager = profileManager;
    this.logger = logger;
    this.context = null;
    this.pages = new Map();
    this.activePageId = null;
  }

  async launch({ profile = 'brahma', headless = false, userDataDir = null, cdpEndpoint = null } = {}) {
    const context = await this.profileManager.getProfile(profile, { headless, userDataDir, cdpEndpoint });
    this.context = context;
    if (!this.pages.size) {
      const page = await this.context.newPage();
      const id = this._registerPage(page);
      this.activePageId = id;
    }
  }

  _registerPage(page) {
    const id = String(page.guid || page._guid || page._pageId || Date.now() + Math.random());
    this.pages.set(id, page);
    page.on('close', () => {
      this.pages.delete(id);
      if (this.activePageId === id) {
        const next = Array.from(this.pages.keys())[0] || null;
        this.activePageId = next;
      }
    });
    return id;
  }

  async openUrl(url) {
    const page = this.getActivePage();
    const target = normalizeUrl(url);
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    return target;
  }

  getActivePage() {
    const page = this.pages.get(this.activePageId);
    if (!page) {
      throw new Error('No active page available.');
    }
    return page;
  }

  async newTab(url = 'about:blank') {
    const page = await this.context.newPage();
    const id = this._registerPage(page);
    this.activePageId = id;
    if (url) {
      await page.goto(normalizeUrl(url), { waitUntil: 'domcontentloaded' });
    }
    return id;
  }

  async listTabs() {
    const entries = Array.from(this.pages.entries());
    const results = [];
    for (const [id, page] of entries) {
      let title = '';
      try {
        title = await page.title();
      } catch {
        title = '';
      }
      results.push({ id, title });
    }
    return results;
  }

  async switchTab(id) {
    if (!this.pages.has(id)) throw new Error('Tab not found.');
    this.activePageId = id;
  }

  async focusTab(id) {
    if (!this.pages.has(id)) throw new Error('Tab not found.');
    const page = this.pages.get(id);
    await page.bringToFront();
    this.activePageId = id;
  }

  async closeTab(id) {
    const page = this.pages.get(id);
    if (!page) return;
    await page.close();
  }

  async getCookies() {
    if (!this.context) return [];
    return this.context.cookies();
  }

  async setCookies(cookies = []) {
    if (!this.context) return;
    await this.context.addCookies(cookies);
  }

  async clearCookies() {
    if (!this.context) return;
    await this.context.clearCookies();
  }

  async getStorage() {
    const page = this.getActivePage();
    return page.evaluate(() => ({
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
    }));
  }

  async setStorage({ localStorageData = {}, sessionStorageData = {} } = {}) {
    const page = this.getActivePage();
    await page.evaluate(
      ({ localStorageData, sessionStorageData }) => {
        Object.entries(localStorageData || {}).forEach(([key, value]) => {
          localStorage.setItem(key, String(value));
        });
        Object.entries(sessionStorageData || {}).forEach(([key, value]) => {
          sessionStorage.setItem(key, String(value));
        });
      },
      { localStorageData, sessionStorageData }
    );
  }

  async clearStorage() {
    const page = this.getActivePage();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  async close() {
    if (this.context) await this.context.close();
    this.context = null;
    this.pages.clear();
    this.activePageId = null;
  }
}
