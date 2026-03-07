# CHANGELOG

All notable changes to **KREASYS** are documented in this file.

---

## [0.4.0] - 2026-03-08

### Added
- **AI-Controllable Browser Panel**: A new `Browser` tab with a sandboxed `iframe` viewer, URL bar, and integrated JS Console. The AI can now autonomously open URLs, run JavaScript in page context, and take screenshots.
- **Three New Agentic XML Skills**:
  - `<browser_open url="..."/>` — Opens a URL or inline HTML blob in the browser iframe. Navigates the Browser tab automatically.
  - `<browser_js>...</browser_js>` — Executes arbitrary JavaScript inside the loaded iframe and logs the return value to memory.
  - `<browser_screenshot out="/workspace/screen.jpg" [tg_chat_id="ID"]/>` — Captures the iframe using `html2canvas`, saves the image to the VFS, and optionally dispatches it directly to a Telegram user via `sendDocument`.
- **Page Scraping**: The "Scrape" button extracts the full text content and title of any loaded page and writes it to `/workspace/scrape_result.txt` in the VFS for the AI to read.
- **`js/ui/browser.js` Module**: All browser panel logic is decoupled into its own module.

### Changed
- **WebLLM Fully Simplified**: `webllm.js` was completely rewritten to mirror the minimal `experimental.html` pattern.
  - The hardcoded `WLLM_MODELS` array has been **removed**.
  - Model list is now dynamically fetched from `webllm.prebuiltAppConfig.model_list` on page load, giving users access to the complete and always-up-to-date catalog from the WebLLM CDN.
  - Removed the complex download library/cache tracking UI (`renderWllmLibrary`, `wllmActivate`, `wllmDelete`, `wLib`, `wMarkDownloaded`).
  - Simplified to: select model from dropdown → click **Download & Load** → `engine.reload()` with progress callback.
- **`app.js` Cleaned**: Removed all dead WebLLM library management functions. `wllmInit()` now delegates to `wllmPopulateDropdown()`.
- **System Prompt Updated**: `D_SKIL` in `state.js` now includes documentation for `<browser_open>`, `<browser_js>`, and `<browser_screenshot>` with Telegram dispatch.
- **Script Cache-Buster** bumped to `?v=4` across all core JS includes.

---

## [0.3.2] - 2026-03-07

### Added
- **Autonomous Telegram File Dispatch** (`<tg_doc>`): The AI can now autonomously upload any VFS file (images, code, text) directly to a Telegram user's chat using the Telegram `sendDocument` API. The file is read from the VFS, converted from Base64 or plain text to a `Blob`, and uploaded as a proper file attachment.
- **Unified Models Tab**: The "Local AI" sidebar tab was removed. The WebLLM local compute interface was fully integrated into the main "Models" tab under a "Local Browser Compute" card.
- **AI Activity Tracking Dashboard**: A new "Tracking" tab (`#p-activity`) provides a live visual timeline of all system events, VFS writes, and AI execution plan steps (`<plan>` tags).

---

## [0.3.1] - 2026-03-07

### Fixed
- **`<render_html>` VFS Race Condition**: Inline HTML in block-form `<render_html>` tags is now processed directly without a separate `<file>` write, eliminating the VFS write/read race condition.
- **WebGPU Hard Block Removed**: The strict WebGPU check in `webllm.js` was converted from a hard blocker to a soft warning. Users can attempt any model download regardless of GPU probe result.
- **AI Streaming Enabled**: `llm()` refactored to use `fetch` Body.getReader() for SSE streaming. Cloud APIs and local WebGPU now stream tokens to the UI in real-time.
- **Script Cache Busting**: All core JS scripts include version query strings (`?v=3`) to force cache invalidation.

---

## [0.3.0] - 2026-03-07

### Added
- **HTML-to-Image Rendering** (`<render_html>`): AI can generate visual content using `html2canvas`, rendering styled HTML directly to a Base64 JPEG in the VFS.
- **Sub-Agent Delegation** (`<delegate>`): Main agent can spin up isolated sub-LLM calls with custom temperatures for pipeline-style parallel task execution.
- **`<plan>` Enforcement**: System prompt now strictly requires `<plan>` tags for complex agentic workflows.

---

## [0.2.1] - 2026-03-01

### Added
- **Single-Instance Telegram Polling Lock**: Uses a randomly generated Tab ID stored in `localStorage` to ensure only one browser tab polls the Telegram API at a time, eliminating `409 Conflict` errors.
- **"Channeling" Dashboard UI**: Redesigned integrations tab with a user directory and multi-service routing framework.
- **"Take Control" Override**: Manual button to steal the Telegram polling lock from other open tabs.

---

## [0.2.0] - 2026-02-28

### Added
- **Dual-Layer Persistent Memory**: `memory.log` (raw session) + `memory.md` (AI-summarized). Idle-time auto-compression prevents context window bloat.
- **Telegram Autonomous Hub**: Bot auto-registers users; AI can cross-message other registered users on its own initiative.
- **Local AI Tab (WebGPU)**: First iteration of the local model management UI with Llama, Phi, Gemma model support.
- **Multi-Modal API Router**: Intent-based routing across OpenRouter, Groq, NVIDIA, OpenAI, HuggingFace, Anthropic, and Ollama.

---

## [0.1.0] - Alpha

### Added
- Virtual File System (VFS) via `localforage.js` backed by IndexedDB.
- Telegram webhook polling, photo/document ingestion.
- Basic `<plan>` flowchart rendering in the UI.
