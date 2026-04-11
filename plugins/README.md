# Brahma AI Plugins

Brahma AI supports lightweight plugins so the community can add new skills and behaviors without touching core code.

## Quick Start

1. Create a folder under `plugins/` with your plugin name.
2. Add a `plugin.json` manifest.
3. Implement your logic in `index.js` (or another entry file).
4. Restart Brahma AI.

## Plugin Manifest

`plugin.json` example:

```json
{
  "name": "example-plugin",
  "version": "1.0.0",
  "description": "A starter plugin for Brahma AI.",
  "entry": "index.js"
}
```

## Plugin API (minimal)

Your entry module should export an object with any of these handlers:

```js
module.exports = {
  id: "example-plugin",
  onCommand: async (text, context) => {
    if (text.includes("hello plugin")) {
      return "Plugin says hi!";
    }
  }
};
```

### Available fields

- `id` (string): unique plugin identifier
- `onCommand(text, context)` (async): run when a user enters a command

## Tips

- Keep plugins small and focused.
- Avoid heavy dependencies unless necessary.
- If you need settings, add a small JSON file in your plugin folder.

## Submission

Open a pull request with your plugin in `plugins/`.
