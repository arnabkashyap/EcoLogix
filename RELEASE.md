# EcoLogix — Windows & Android Release Builds

This repository includes native shells around the `frontend/` React app so it can be packaged as a **Windows installer** (Tauri v2) and an **Android app** (Capacitor), alongside the existing web deployment.

> **Web Deployment Integrity:** The existing web deployment on Vercel is unaffected. `npm run build` (with no flags) and the `vercel.json` build pipeline produce standard same-origin relative `/api/v1` requests with no extra environment variables required.

Both native shells point at the deployed FastAPI backend (`https://eco-logix.vercel.app/api/v1`) by default, configured via `frontend/.env.native`. Neither bundles a local Python process — see [Going Further](#going-further-bundling-the-backend-for-offline-desktop-use) if offline use becomes a requirement.

---

## 1. Repository Structure & What Was Added

```
frontend/
├── .env.native              # VITE_API_BASE_URL for native builds only
├── src-tauri/               # Windows desktop shell (Tauri v2)
│   ├── tauri.conf.json      # Window settings, bundle targets, hooks
│   ├── Cargo.toml           # Rust package manifest
│   ├── build.rs             # Tauri build script
│   ├── src/main.rs          # Minimal desktop shell entrypoint
│   └── icons/               # Multi-platform app icons (generated via tauri icon)
├── capacitor.config.json    # Android shell configuration (Capacitor)
└── android/                 # Android native project
    ├── build.gradle
    └── app/
        ├── build.gradle     # Release signing configuration (env-driven)
        └── src/main/AndroidManifest.xml
.github/workflows/release.yml # Automated CI pipeline creating draft releases on git tags
```

- **[frontend/src/services/api.js](file:///d:/WebDevProject/Tigma2026/frontend/src/services/api.js)** was updated to respect `VITE_API_BASE_URL` when set, falling back to relative `/api/v1` routes for web builds.
- **Authentication**: Preserves the existing JWT-in-`localStorage` auth flow (`getStoredToken` / `setStoredToken`).

---

## 2. Windows — Local Desktop Build

### Requirements
- **Rust (Stable)** + **Cargo**: Install via [rustup.rs](https://rustup.rs/)
- **Node.js**: v20+
- **C++ Build Tools**: [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (MSVC)

### Build Steps
```bash
cd frontend
npm install
npm run tauri:build
```

This compiles the React app via `npm run build:native` and outputs:
- **MSI Installer**: `frontend/src-tauri/target/release/bundle/msi/*.msi`
- **NSIS Executable**: `frontend/src-tauri/target/release/bundle/nsis/*.exe`

### Before Shipping Publicly
1. **App Icons**: Generate brand icons using `npm run tauri icon path/to/source.png` (requires 1024×1024 PNG/SVG).
2. **Code Signing**: Unsigned builds trigger Windows SmartScreen warnings on first run. Configure `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in CI secrets or sign locally with `signtool.exe`.

---

## 3. Android — Local Mobile Build

### Requirements
- **Android Studio** / Command-line Android SDK
- **JDK 21** (Required by Capacitor 8 / Android compileSdk 36)
- **Node.js**: v20+

### Build Steps
```bash
cd frontend
npm install
npm run build:native
npx cap sync android
```

### Generate a Release Keystore (One-Time)
```bash
keytool -genkey -v -keystore ecologix-release.keystore \
  -alias ecologix -keyalg RSA -keysize 2048 -validity 10000
```
> ⚠️ **IMPORTANT:** Never commit keystore files to version control. Store backups securely. Losing your keystore prevents releasing updates to the same Google Play listing.

### Build Signed Release Packages
```bash
# In Bash / macOS / Linux:
export ECOLOGIX_KEYSTORE_PATH=/path/to/ecologix-release.keystore
export ECOLOGIX_KEYSTORE_PASSWORD=your_keystore_password
export ECOLOGIX_KEY_ALIAS=ecologix
export ECOLOGIX_KEY_PASSWORD=your_key_password

# Build Play Store App Bundle (.aab):
npm run android:build   # -> android/app/build/outputs/bundle/release/*.aab

# Build Directly-Installable Release APK (.apk):
npm run android:apk     # -> android/app/build/outputs/apk/release/*.apk
```

### Before Shipping Publicly
1. **Splash & Icons**: Generate launcher icons via `npx @capacitor/assets generate --android` using `assets/icon.png` (1024×1024) and `assets/splash.png` (2732×2732).
2. **Play Console Policy**: Complete the Play Console Data Safety form disclosing location/route data handling.

---

## 4. CI/CD Release Pipeline

The GitHub Actions workflow in [`.github/workflows/release.yml`](file:///.github/workflows/release.yml) automatically compiles and packages both platforms:

1. **`windows` Job**: Builds the `.msi` installer and `.exe` NSIS setup.
2. **`android` Job**: Uses JDK 21 to build both the `.apk` (direct installation) and `.aab` (Google Play bundle).
3. **`release` Job**: Runs after both platform jobs complete on a git tag push (`v*.*.*`), downloading all 4 artifacts and creating a **Draft GitHub Release** with auto-generated release notes:
   - `EcoLogix_x.x.x_x64_en-US.msi`
   - `EcoLogix_x.x.x_x64-setup.exe`
   - `app-release.apk`
   - `app-release.aab`

> **Draft Release Safety:** Releases are published as **Drafts** by default so maintainers can review artifacts in the GitHub Releases UI before publishing.

### Smoke-Testing in CI
- Triggering `workflow_dispatch` (manual run) runs both build jobs and uploads workflow artifacts for testing without creating draft releases.
- Pushing a version tag (`git tag v1.0.0 && git push --tags`) triggers the full release pipeline and publishes the draft release.

### CI Repository Secrets
Configure the following under **Settings → Secrets and variables → Actions**:
- `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `ECOLOGIX_KEYSTORE_BASE64` (Base64 encoded `.keystore` / `.jks` file)
- `ECOLOGIX_KEYSTORE_PASSWORD`
- `ECOLOGIX_KEY_ALIAS`
- `ECOLOGIX_KEY_PASSWORD`

---

## 5. Going Further: Bundling the Backend for Offline Desktop Use

The current desktop and mobile builds require network connectivity to `https://eco-logix.vercel.app/api/v1`. If fully offline desktop operation is required in the future:

1. **PyInstaller Binary**: Freeze `backend/` into a standalone binary (`ecologix-backend.exe`).
2. **Tauri Sidecar**: Register the binary as an `externalBin` in `frontend/src-tauri/tauri.conf.json`.
3. **Lifecycle Management**: Spawn the backend process from `frontend/src-tauri/src/main.rs` before opening the webview window, target `http://localhost:8000/api/v1`, and terminate the process when the window closes.
