# Version 0.2.0 expansion

The first expansion batch is implemented independently under the existing MIT license. No PDFCraft source or assets were incorporated; no new runtime dependencies were required.

## Added

| Tool | Behavior |
| --- | --- |
| Inspect PDF | Standard metadata, visible page sizes in points/mm, rotation, orientation, rewrite warnings, JSON report |
| Edit metadata | Standard title/author/subject/keywords editing; removal of the Info dictionary and catalog XMP stream |
| Alternate merge | Two front/back stacks, optional reversal of backs, remaining pages appended |
| Resize pages | A4 or Letter, selected ranges, margins, orientation, centered fit without stretching |
| Crop pages | Display-relative percentages, current visible-box handling, crop preview, selected ranges |
| Headers & footers | Single-line Latin text, alignment, size, margin, numbering tokens, visible-orientation placement |
| Pages per sheet | 2-up/4-up layouts, paper size, margins, spacing, page ranges, final-sheet empty spaces |
| Organize enhancements | Reverse order, duplicate, insert blanks at a position or at the end; all undoable |

The homepage now has 16 tools. Crop is not redaction, and standard metadata removal is not full document sanitization. Inspection remains read-only and reports editing limitations instead of rejecting advanced documents solely because rewriting is unsupported.

## Verification

- Strict TypeScript check passed.
- 57 core tests passed, including 34 expansion cases.
- 24 production browser checks passed in the supported in-app browser.
- The same 24 checks passed after the verification server was stopped and the cached page was reloaded.
- Rendering checks compare quadrant colors before/after resize with offset crop boxes at 0, 90, 180, and 270 degrees.
- New layouts retain selectable text; headers/footers are checked through text extraction; source-byte preservation, metadata removal, blank pages, and unequal front/back stacks are covered.
- macOS arm64 native crop open/process/save passed; the saved PDF was independently checked for page count and visible dimensions. The native inspection UI displayed the expected metadata and page-size report for that exported PDF.
- Final production output excludes the developer verification page and includes 20 static tool/info routes.

The command-line Playwright suite has been extended but remains unverified in this environment because Chromium was blocked from starting in the previous run. Actual Windows/Linux, macOS Intel, Firefox/Safari/mobile, public signing/notarization, and hosting/domain setup remain release gates.

The source, static website archive, and macOS Apple Silicon development archive are refreshed together for this version. The macOS artifact remains a development build without public developer signing/notarization.

## Still deferred

Side-by-side comparison, batch presets, additional image decoders, form editing, and advanced conversion remain later roadmap work. See FEATURE_ROADMAP.md.
