# Changelog

## Unreleased

- Rotate selected pages before OCR and optionally export page confidence reports.

- Retry individual unsuccessful batch files and show form field requirements and limits.

- Swap compared PDFs and save a highlighted visual comparison as PNG.

- Compare selectable text by page and save a local text-difference report.

- Add local WebP image input and page-image output when supported by the browser.

- Add automatic orientation for image PDFs and grayscale/JPEG-quality controls for page-image export.

- Reorder and remove flat bookmarks, duplicate workflow steps, and show comparison change percentage.

- Append top-level bookmarks to existing nested outlines and import or export workflow presets.

- Support multi-select dropdown values and appending page links to flat bookmark lists.

- Add attachments to existing flat attachment lists while retaining prior files.

- Fill and flatten editable PDF dropdown fields.

- Rename nested bookmark titles while retaining hierarchy and destinations.

- Rename flat bookmarks and unlink attachments from simple name trees in a saved copy.

- Add optional per-file page ranges for batch processing and retries.

- Support multi-select form lists and optional local batch reports.

- Support single-select form list boxes, adjustable visual comparison sensitivity, and removal of cached OCR language packs.

- Retry failed and unfinished batch items while keeping successful outputs.

- Add optional pixel-difference highlighting to PDF comparison.

- Add booklet imposition with left or right binding and blank-page padding.

- View bookmarks and attachments, and add new ones to PDFs without existing structures.

- Fill standard PDF text fields, checkboxes, dropdowns and radio buttons, with optional flattening.

- Create plain-text PDFs locally with wrapping, pagination and UTF-8 text-file input.

- Add local side-by-side PDF comparison with synchronized pages.

- Add reusable local PDF workflows with named settings presets, sequential progress and cancellation.
- Update Cloudflare Pages deployment guidance and manual workflow target.


## 0.7.0

- Added batch mode to 15 tools, using shared settings and sequential per-document workers.
- Added per-file progress, independent failure handling, cancellation with partial-result retention, and individual/ZIP export.
- Added safe numbered source-name prefixes for outputs, including duplicate filenames. ZIP creation runs in a cancellable worker.
- Reused one browser job adapter for individual and batch processing, with PDF load failure/cancellation cleanup.
- Fixed the page-range input accessible name used by keyboard/screen-reader and UI test workflows.


## 0.6.0

- Added Protect PDF with AES-256 revision 6 encryption and Unlock PDF using known opening or owner passwords.
- Added QPDF 12.4.2 WASM with full runtime notices and offline asset bundling.
- Added password confirmation, hide/show controls, field clearing, cancellation, and sanitized errors.
- Retained rewrite guards for signed, certified and XFA files and verified standard document structure preservation.


## 0.5.0

- Added local OCR with searchable PDF and UTF-8 text outputs, page ranges, 150/200/300 DPI settings, and cancellation.
- Bundled English, Spanish, French, German, Hindi, and Tamil packs for desktop. Web packs use explicit downloads with SHA-256 verification and offline caching.
- Preserved original artwork, page crop/rotation, and standard PDF structures while adding invisible text. Existing text pages are skipped by default.
- Added low-confidence page hints, blank-scan errors, and printed-text limitations.


## 0.4.0 — Local PDF compression

- New Compress PDF tool with lossless and optional embedded-image modes.
- Bounded Flate stream recompression and PDF object-stream packing.
- Sequential local image encoding preserves text, vector content and document structure.
- Quality/pixel-edge controls, skipped-image reporting, and before/after size comparison.
- Return an unchanged copy when the candidate would be larger or equal.
- Keep signed/certified/XFA documents protected and mask/color/orientation-sensitive images unchanged.

## 0.3.0 — Broader PDF compatibility

- Operation-specific preservation rules for the six in-place tools.
- Retain standard form values/appearances, annotation links, bookmark targets, and attachments.
- Keep page-rebuilding tools guarded against structural loss.
- Report available/restricted edits in Inspect PDF.
- Inspect forms without invoking the form editor or stripping XFA; retain form appearances on save.
- Detect nested signatures and protect certification permissions; retain empty unsigned signature fields.
- Avoid breaking shared metadata references when removing document metadata.

## 0.2.0 — Local toolkit expansion

- Seven new tools: inspection, metadata editing/removal, alternate merge, resize, crop, headers/footers, and pages-per-sheet.
- Reverse, duplicate, and insert blank pages in Organize, with undo and bounded previews.
- Visible-coordinate layout handling for existing crop boxes and cardinal page rotations.
- Clear limitations for crop/metadata removal and read-only inspection of advanced documents.
- Extended core, browser, and visual rendering checks; additional static tool routes.

## 0.1.0 — Development preview

- Nine local PDF workflows with shared React UI and platform adapters.
- Worker transformations, previews, ranges, cancellation, and ZIP export.
- Versioned PWA cache with bundled PDF rendering assets.
- Conservative rewrite guards for signed and advanced documents.
- Tauri desktop shell, offline Windows runtime packaging, and CI workflows.
- No signed release binaries or production deployment are included in this preview.
