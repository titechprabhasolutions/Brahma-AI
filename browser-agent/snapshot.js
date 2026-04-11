export async function buildSnapshot(page) {
  const snapshot = await page.evaluate(() => {
    const elements = [];
    let id = 1;
    const interactiveSelectors = [
      'a',
      'button',
      'input',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="textbox"]',
    ];
    const nodes = document.querySelectorAll(interactiveSelectors.join(','));
    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return;
      const style = window.getComputedStyle(node);
      const visible = style.visibility !== 'hidden' && style.display !== 'none' && rect.height > 0 && rect.width > 0;
      const disabled = node.disabled || node.getAttribute('aria-disabled') === 'true';
      const role = node.getAttribute('role') || node.tagName.toLowerCase();
      const text = (node.innerText || node.value || '').trim();
      const placeholder = node.placeholder || '';
      const interactable = visible && !disabled;
      const dataId = node.getAttribute('data-agent-id') || String(id);
      node.setAttribute('data-agent-id', dataId);

      elements.push({
        id: Number(dataId),
        role,
        type: node.tagName.toLowerCase(),
        text,
        placeholder,
        bbox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        visible,
        interactable,
        selector: `[data-agent-id="${dataId}"]`,
      });
      id += 1;
    });
    return elements;
  });
  return snapshot;
}

export async function refreshSnapshotIfInvalid(page, snapshot, targetId) {
  const exists = Array.isArray(snapshot) && snapshot.some((item) => item.id === Number(targetId));
  if (exists) return snapshot;
  return buildSnapshot(page);
}
