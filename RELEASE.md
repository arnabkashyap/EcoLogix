# EcoLogix Release & Distribution Guide

This document outlines the build, packaging, signing, and distribution processes for EcoLogix native desktop and mobile platforms.

---

## 1. Prerequisites & Architecture Overview

The native desktop shell uses **Tauri v2** with a Rust-based webview host wrapping the Vite/React frontend.

- **Frontend Native Build**: `npm run build:native` (loads `frontend/.env.native` pointing `VITE_API_BASE_URL` to `https://eco-logix.vercel.app/api/v1`).
- **No Local Backend Process**: Native builds do not run a local Python interpreter or SQLite process; all API traffic routes securely over HTTPS to the deployed backend.
- **Auth Preservation**: Uses the existing JWT-in-`localStorage` token store (`getStoredToken` / `setStoredToken`) in `frontend/src/services/api.js`.

---

## 2. Windows Desktop Release (Tauri)

### Requirements:
1. **Rust Toolchain**: Stable Rust (`rustup default stable`)
2. **C++ Build Tools**: Visual Studio 2022 C++ Build Tools with English language pack (MSVC)
3. **Node.js**: v18+ with `npm`

### Step 1: Generate Brand Icons
Place your 1024×1024 brand PNG (e.g. `icon.png`) and run:
```bash
cd frontend
npm run tauri icon path/to/icon.png
```
*Note: Tauri requires the generated files in `frontend/src-tauri/icons/` to build installers.*

### Step 2: Build Native Installers
```bash
cd frontend
npm run tauri:build
```
This triggers:
1. `beforeBuildCommand`: `npm run build:native` (compiles production React bundle with deployed API URL)
2. `cargo build --release` (compiles Rust host)
3. Windows installer generation:
   - **MSI Installer**: `frontend/src-tauri/target/release/bundle/msi/EcoLogix_x.x.x_x64_en-US.msi`
   - **NSIS Setup (.exe)**: `frontend/src-tauri/target/release/bundle/nsis/EcoLogix_x.x.x_x64-setup.exe`

---

## 3. Code Signing & Security (Windows SmartScreen)

### Unsigned Builds Notice
Unsigned Windows `.exe` and `.msi` installers will trigger a **Windows Defender SmartScreen** prompt (*"Windows protected your PC — Unknown publisher"*). Users must click **More info** $\to$ **Run anyway** to proceed.

### CI/CD Code Signing Configuration
To produce trusted, signed installers in CI (e.g. GitHub Actions / Azure Pipelines):

1. **Do NOT commit private keys, keystores, or certificates to the repository.**
2. Set up code signing in CI using environment variables:
   - `TAURI_SIGNING_PRIVATE_KEY`: Base64 encoded private key or certificate path.
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Passphrase for the signing key.
5. For Windows Authenticode / EV code signing:
   - Use `signtool.exe` or Azure Trusted Signing in CI workflows configured via repository secrets.

---

## 4. Android Mobile Release (Capacitor)

### Verifying Map in WebView

Note: Map rendering with react-leaflet has been verified in an Android WebView. Gesture interactions (pinch-to-zoom and panning) have been manually tested inside a Capacitor emulator running Android 14. No workarounds disabling map interactivity are needed.

### Creating a Signing Keystore (One-time)

To generate the keystore required to sign the release AAB/APK:

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

**WARNING:** Never commit the keystore to version control. If you lose this keystore, you will lose the ability to publish updates to the same Play Store listing.

### Build Android Artifacts

To build the release APK (without signing variables, produces an unsigned build):

```bash
cd frontend
npm run android:apk
```

To build a signed App Bundle (.aab) for Google Play:

```bash
# In Bash:
export ECOLOGIX_KEYSTORE_PATH=/path/to/my-release-key.jks
export ECOLOGIX_KEYSTORE_PASSWORD=my_keystore_password
export ECOLOGIX_KEY_ALIAS=my-key-alias
export ECOLOGIX_KEY_PASSWORD=my_key_password

# Or in PowerShell:
# $env:ECOLOGIX_KEYSTORE_PATH="C:\path\to\my-release-key.jks"
# ...

cd frontend
npm run android:build
```
