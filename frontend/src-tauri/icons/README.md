# EcoLogix Desktop Icons

This directory holds the desktop application icon assets for the Tauri Windows / cross-platform desktop build.

## Required Assets

Tauri requires the following icon files in this directory for bundling:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.ico` (Windows executable & installer icon)
- `icon.icns` (macOS bundle icon)

> **IMPORTANT**: No placeholder icons are fabricated in the repository. This is an intentional manual step so that placeholder artwork cannot ship silently into production releases.

## How to Generate the Icon Set

1. Prepare a high-resolution, square PNG (at least **1024×1024 px**) representing the official EcoLogix brand mark (e.g. `logo-1024.png`).
2. Run the Tauri icon generation command from the `frontend/` directory:

```bash
cd frontend
npm run tauri icon /path/to/logo-1024.png
```

This command automatically generates all required PNG, ICO, and ICNS sizes and places them into `frontend/src-tauri/icons/`.

## Build Behavior

Tauri's packaging process (`npm run tauri:build`) will fail loudly if the icon files are missing, ensuring you add the proper brand assets before generating distributable `.msi` and `.exe` installers.
