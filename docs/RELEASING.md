# Deployment and release

## Static website

1. Create a public GitHub repository and push this source. Configure the repository's security advisory channel and set `VITE_REPOSITORY_URL` to its actual URL.
2. Create a Cloudflare Pages project named `local-pdf-tools`. For Git integration: build command `pnpm build`, output `apps/web/dist`, Node 22.12+.
3. Alternatively run the manual Pages workflow after setting `CLOUDFLARE_API_TOKEN` (Pages edit on the target account) and `CLOUDFLARE_ACCOUNT_ID` secrets. Set repository variable `REPOSITORY_URL` and optional `SPONSOR_URL`.
4. Inspect the deployment URL, CSP, direct tool routes, and offline flow before adding `localpdftools.com` through Cloudflare's custom-domain setup. Follow the DNS records Cloudflare provides. The code does not change DNS.
5. For rollback, redeploy the prior known-good commit. Offline cache versions derive from build bytes; service workers retain a complete cache and replace old application caches upon activation. An already-open session may need a reload after an update; reload only after saving its work.

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
