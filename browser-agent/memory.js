export class MemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentPage = '';
    this.lastSnapshot = [];
    this.activeTask = null;
    this.stepHistory = [];
    this.tabs = [];
    this.activeTabId = null;
    this.tabContext = new Map();
    this.lastVisitedUrls = [];
    this.activeWorkflow = null;
    this.lastAction = null;
  }

  setSnapshot(snapshot) {
    this.lastSnapshot = Array.isArray(snapshot) ? snapshot : [];
  }

  setActiveTask(task) {
    this.activeTask = task;
  }

  pushStep(step) {
    this.stepHistory.push({
      ...step,
      ts: Date.now(),
    });
    if (this.stepHistory.length > 200) {
      this.stepHistory.shift();
    }
  }

  updateTabs(tabs = [], activeId = null) {
    this.tabs = tabs;
    this.activeTabId = activeId;
    if (activeId && !this.tabContext.has(activeId)) {
      this.tabContext.set(activeId, {
        lastUrl: '',
        lastSnapshot: [],
        lastActions: [],
      });
    }
  }

  recordAction(action, result) {
    this.lastAction = { action, result, ts: Date.now() };
    if (this.activeTabId) {
      const ctx = this.tabContext.get(this.activeTabId) || {
        lastUrl: '',
        lastSnapshot: [],
        lastActions: [],
      };
      ctx.lastActions.push({ action, result, ts: Date.now() });
      if (ctx.lastActions.length > 50) ctx.lastActions.shift();
      this.tabContext.set(this.activeTabId, ctx);
    }
  }

  updateTabSnapshot(tabId, snapshot = []) {
    if (!tabId) return;
    const ctx = this.tabContext.get(tabId) || { lastUrl: '', lastSnapshot: [], lastActions: [] };
    ctx.lastSnapshot = snapshot;
    this.tabContext.set(tabId, ctx);
  }

  updateTabUrl(tabId, url = '') {
    if (!tabId) return;
    const ctx = this.tabContext.get(tabId) || { lastUrl: '', lastSnapshot: [], lastActions: [] };
    ctx.lastUrl = url;
    this.tabContext.set(tabId, ctx);
    if (url) {
      this.lastVisitedUrls.push(url);
      if (this.lastVisitedUrls.length > 30) this.lastVisitedUrls.shift();
    }
  }
}
