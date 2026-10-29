> Update: Booklet layout now supports batch mode, and failed or unfinished files can be retried without rerunning successful files. Passwords must be re-entered before retry. Streaming and per-file settings remain future work.

# Step 5 — batch processing (0.7.0)

Batch mode applies one tool and shared settings independently to several PDFs. The original 20-tool registry is unchanged; 15 tools offer a “Process multiple PDFs separately” checkbox. Merge, alternate merge and images-to-PDF retain their combined-file workflows. Organization and metadata editing remain individual workflows.

Supported: compression, split/extract, PDF-to-images, text extraction, page numbers, watermarks, visual signatures, inspection, resize, crop, headers/footers, pages-per-sheet, OCR, protect and unlock. Password tools apply the same supplied password across the batch; different per-file passwords are not included. OCR uses the selected prepared/bundled language pack. Page ranges are validated independently against each document.

## Execution and output

Only one document's processing job runs at a time. Individual and batch modes share the same job adapter and engine workers. PDF.js loads are destroyed on cancellation or failure. Status records distinguish waiting, processing, succeeded, failed, cancelled and not processed. Errors do not stop later files. Stopping discards the active file's unfinished output, skips waiting files, and preserves completed results for export.

Successful outputs can be saved separately or as an uncompressed ZIP assembled in a cancellable worker. Numbered source-name prefixes distinguish duplicate source names. Paths/control characters are removed; names are normalized, bounded by UTF-8 byte length, and collision-checked. ZIP output does not include failures, source documents or passwords. Source filenames are used only in session UI and local export names.

Selected source bytes and completed outputs stay in session memory. Sequential execution limits simultaneous engine work; it does not bound the total memory needed for selected inputs, retained outputs and ZIP assembly. Smaller groups are appropriate for limited-memory devices. Streaming I/O, output spilling, presets, per-file settings and failed-only retries remain future work. No documents/results are saved automatically to browser storage or uploaded.

## Verification

The batch unit suite covers scheduling/order, independent errors and options, cancellation/partial results, safe collision-free filenames, Unicode byte limits, immutable status snapshots, progress and real PDF split/range handling. Browser checks exercise actual image compression, rendering, text, OCR and password adapters, ZIP parsing, malformed-load recovery and cancellation. TypeScript and 142 core tests pass. All 68 production browser checks passed, including after stopping the server and reloading offline. The native macOS multi-file/partial-failure/ZIP-save workflow passed and its ZIP/PDF output was checked independently. Detailed results are recorded in VERIFICATION.md. Windows/Linux, other browsers and large batches remain unqualified; signing/notarization and public deployment remain pending.
