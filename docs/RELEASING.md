# Deployment and release

## Static website

The production Cloudflare Pages project is `local-pdf-tools-web`, connected to `raakkan/local-pdf-tools`. Pushes to `main` trigger builds with `pnpm build`, output `apps/web/dist`, Node 22, and pnpm 10.28.2. The active custom domains are `localpdftools.com` and `www.localpdftools.com`.

Inspect the deployment, CSP, tool routes, and offline flow after changes. For rollback, redeploy a prior known-good commit through Cloudflare. The older `local-pdf-tools` project is separate and is not the production domain target. The optional manually triggered GitHub workflow targets `local-pdf-tools-web` and requires separately configured Cloudflare credentials; normal deployments use the Git connection.

## Desktop qualification and artifacts

The desktop CI workflow builds development artifacts on Windows, macOS, and Ubuntu; these are not advertised as verified signed releases. It requires GitHub-hosted runners and downloads the Rust toolchain and platform build dependencies.

Initial qualification targets: Windows 11 x64; macOS 13+ arm64 and x64; Ubuntu 24.04 x64. Tauri uses system webviews; verify each on actual target systems. Windows installation can be offline because WebView2's offline installer is bundled. Linux requires the WebKitGTK/system dependencies documented by Tauri.

For a signed release:

1. Update application/package and Tauri versions together and review licenses, bundled font notices, dependency advisories, and the lockfile.
2. Pass core/browser tests and the manual qualification checklist in VERIFICATION.md. Do not claim support solely from a successful build.
3. Provision Apple Developer signing/notarization credentials for macOS. Configure `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` per Tauri's signing documentation. Use CI secrets, never committed files.
4. Configure a Windows Authenticode certificate/service. Set the Tauri Windows signing configuration for that provider and sign installers. A certificate thumbprint only works where the certificate is installed in the runner's store; the generic workflow intentionally does not pretend to configure a provider.
5. Build platform-native installers; test fresh install, file dialogs, cancellation, save, first-launch offline processing, upgrade, and uninstall. Verify macOS notarization and Windows signatures independently.
6. Create a draft GitHub Release, upload installers plus third-party notices and SHA-256 sums (generate with `node scripts/checksums.mjs PATH-TO-ARTIFACTS`), and record tested OS/webview versions. Publish only after review. Set the actual repository URL at build time to enable release links.

Automatic updater integration is deferred. Users can manually visit release availability from the Downloads page when a repository is configured. Never send document metadata during an update check.

## Later work

Compression and OCR are implemented; continue platform, accuracy, and memory qualification before a stable release. Batch presets and CLI should reuse the core job API. No deferred operation should silently upload files.
