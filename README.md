# Brahma AI

Brahma AI is a personal, Windows-first AI assistant with voice interaction, local task execution, and an Electron UI.

## Features

- Voice input and spoken responses
- Task automation and multi-step command execution
- Browser automation (Playwright agent)
- Customizable UI and local-first workflow

## Requirements

- Windows 10/11
- Node.js 18+ (recommended)
- Python 3.10+

## Quick Start (Local)

```bash
npm install
python -m pip install -r requirements.txt
```

Create your API key file:

```bash
copy config\\api_keys.example.json config\\api_keys.json
```

Edit `config\\api_keys.json` and add your Gemini API key.

Run the app:

```bash
npm start
```

## Build

```bash
npm run dist
```

This runs the backend build and produces an Electron build folder in `release/`.

## Plugins

See `plugins/README.md` for how to add community plugins.

## Configuration

- `config/api_keys.json`: API keys (do not commit real keys)
- `config/voice_settings.json`: Voice preferences
- `config/hybrid_settings.json`: Optional feature toggles

## Repository Hygiene

This repo is intended to be open source. Do not commit:

- API keys or secrets
- `electron-data/` (local user data)
- Build artifacts (`dist/`, `release/`, `bk/`, `*.exe`)

See `.gitignore` for the full list.

## Contributing

See `CONTRIBUTING.md`.

## Security

See `SECURITY.md`.

## License

MIT License. See `LICENSE`.
