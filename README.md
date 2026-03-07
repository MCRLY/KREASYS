<div align="center">
  <img src="https://www.kreasioka.com/img/logo.svg" alt="KREASYS Logo" width="80">
  <h1>KREASYS</h1>
  <p><strong>Autonomous Browser-Native IDE &amp; Multi-Modal AI Ecosystem</strong></p>

  <p>
    <a href="https://github.com/KREASIOKA/KREASYS/stargazers">
      <img src="https://img.shields.io/github/stars/KREASIOKA/KREASYS?style=for-the-badge&color=00ffcc&logo=github&logoColor=white" alt="Stars">
    </a>
    <a href="https://github.com/KREASIOKA/KREASYS/graphs/contributors">
      <img src="https://img.shields.io/github/contributors/KREASIOKA/KREASYS?style=for-the-badge&color=00b3ff&logo=github" alt="Contributors">
    </a>
    <a href="https://www.linkedin.com/company/kreasioka/">
      <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JS">
    <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML">
    <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS">
    <img src="https://img.shields.io/badge/WebGPU-Enabled-00ffcc?style=flat-square" alt="WebGPU">
    <img src="https://img.shields.io/badge/PWA-Ready-673AB7?style=flat-square" alt="PWA">
  </p>
</div>

> **Alpha Release:** KREASYS is actively developed. Features evolve rapidly. Contributions and feedback are welcome.

---

## Overview

KREASYS is a **100% client-side, serverless** agentic IDE that runs entirely in your browser. There is no backend, no build step, and no server to manage. It provides a full environment for autonomous AI agents equipped with a Virtual File System, persistent memory, multi-provider model routing, Telegram integration, local LLM inference, and a controllable browser panel.

The core insight: everything a server traditionally handles — file storage, process execution, memory, AI routing — can be wired together in a modern browser using IndexedDB, WebGPU, WebAssembly, and Service Workers.

---

## Table of Contents

- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Core Modules](#core-modules)
  - [state.js — Global State & System Prompts](#statejs--global-state--system-prompts)
  - [vfs.js — Virtual File System & Agentic Tag Parser](#vfsjs--virtual-file-system--agentic-tag-parser)
  - [ai.js — Multi-Provider LLM Router](#aijs--multi-provider-llm-router)
  - [memory.js — Dual-Layer Persistent Memory](#memoryjs--dual-layer-persistent-memory)
  - [webllm.js — Local Browser Inference (WebGPU)](#webllmjs--local-browser-inference-webgpu)
  - [telegram.js — Autonomous Telegram Hub](#telegramjs--autonomous-telegram-hub)
  - [browser.js — AI-Controllable Browser Panel](#browserjs--ai-controllable-browser-panel)
  - [app.js — UI Initialization & Bindings](#appjs--ui-initialization--bindings)
- [Agentic XML Skills](#agentic-xml-skills)
- [UI Tabs](#ui-tabs)
- [Quick Start](#quick-start)
- [Configuration](#configuration)

---

## Architecture

KREASYS is event-driven and reactive. The AI outputs structured XML tags alongside plain text. The VFS parser intercepts these tags and executes side effects — writing files, rendering images, opening URLs, dispatching Telegram messages.

```
User / Telegram Input
       │
       ▼
  route() ── Intent Router ──▶ Select Best Model (Local or Remote)
       │
       ▼
  llm() ── Streaming LLM Call ──▶ Token-by-token UI update
       │
       ▼
  psVfs() ── Agentic Tag Parser
       ├── <file>          → Write to VFS + IndexedDB
       ├── <render_html>   → html2canvas → Base64 image → VFS
       ├── <plan>          → Render flowchart in Tracking tab
       ├── <delegate>      → Spawn sub-agent LLM call
       ├── <tg_send>       → Telegram sendMessage
       ├── <tg_doc>        → Telegram sendDocument (VFS file → Blob)
       ├── <browser_open>  → Navigate iframe in Browser panel
       ├── <browser_js>    → Eval JS in iframe context
       └── <browser_screenshot> → html2canvas iframe → VFS + optional Telegram
```

---

## File Structure

```
KREASYS/
├── index.html              # Single-page app shell, all UI panels
├── css/
│   └── styles.css          # Design system: variables, layout, components
├── js/
│   ├── core/
│   │   ├── state.js        # Global state (st), system prompts, user directory
│   │   ├── vfs.js          # VFS read/write + entire agentic tag parser
│   │   ├── ai.js           # LLM router: streaming, sub-agents, provider adapters
│   │   ├── memory.js       # Dual-layer memory compression + idle summarizer
│   │   ├── webllm.js       # WebLLM (WebGPU) local inference engine wrapper
│   │   └── telegram.js     # Telegram polling, file dispatch, cross-user messaging
│   ├── ui/
│   │   ├── app.js          # Boot sequence, UI bindings, tab system, WebLLM init
│   │   └── browser.js      # AI-controllable Browser panel + JS Console logic
│   └── global.js           # PWA service worker registration
├── icons/                  # PWA icons
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (offline cache)
├── experimental.html       # Minimal WebLLM reference implementation
├── CHANGELOG.md
└── README.md
```

---

## Core Modules

### `state.js` — Global State & System Prompts

The application's single source of truth. Defines and persists the `st` object to IndexedDB via `localforage`.

**Key exports:**
- `st` — Global mutable state: `vfs`, `mods`, `cfg`, `id`, `tk`, `ts`, `poll`, `cfn`
- `D_PERS` — Default AI personality (injected as system prompt)
- `D_SKIL` — Agentic skill definitions (injected as system prompt, teaches the AI every XML tag it can use)
- `ld()` — Boot loader: restores state from IndexedDB, hydrates UI
- `svGlb()` — Atomic save: serializes current `st` back to IndexedDB
- `renderTgUsers()` — Renders the Channeling tab's known user directory from `st.cfg.tgUsers`

---

### `vfs.js` — Virtual File System & Agentic Tag Parser

The engine room. Manages `st.vfs` (the in-memory file tree) and is the sole parser of every agentic XML tag the AI produces.

**Key functions:**
- `psVfs(ctx)` — Scans an AI response string for all XML skill tags and executes them. Called after every LLM response.
- `runHtml2Canvas(html, outPath)` — Spawns a hidden `iframe`, injects HTML, captures it with `html2canvas`, writes Base64 JPEG to VFS.
- `launchSubAgent(taskName, prompt, temp)` — Fires an isolated `llm()` call for delegation; appends result to `memory.log`.
- `rVfs()` — Re-renders both the System and Workspace file trees in the IDE panel.

**Parsed XML tags:** `<file>`, `<render_html>`, `<delegate>`, `<tg_doc>`, `<browser_open>`, `<browser_js>`, `<browser_screenshot>`

---

### `ai.js` — Multi-Provider LLM Router

Abstracts all AI inference behind a single `llm(system, user, model)` call with real-time streaming.

**Key functions:**
- `route(query, fileCtx)` — Intent router. Scores each configured model against the query type (text, image, audio, vision) and returns the best match.
- `llm(system, user, model)` — Dispatches to the appropriate provider. For `webllm` type models, calls `wLlm()`. For cloud models, performs a streaming `fetch` with SSE `getReader()`. Updates the chat bubble token-by-token.
- Supported providers: `openrouter`, `groq`, `nvidia`, `openai`, `huggingface`, `anthropic`, `ollama`, `custom`, `webllm`

---

### `memory.js` — Dual-Layer Persistent Memory

Prevents context window bloat across long sessions.

**Architecture:**
- **`/system/memory.log`** — Raw, append-only activity stream (last ~50K chars). Used as immediate context.
- **`/system/memory.md`** — AI-summarized long-term facts. Injected into every prompt.

**Key functions:**
- `memInit()` — Starts the idle-time compression timer (fires after 60s of `st.run === 0`).
- `memCompress()` — Silently calls `llm()` to summarize `memory.log` into `memory.md`, then truncates the log.
- `memAppend(role, content)` — Appends a structured entry to the raw log.
- `memContext()` — Returns a formatted string combining both layers for injection into any AI prompt.

---

### `webllm.js` — Local Browser Inference (WebGPU)

Wraps the [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) CDN module for zero-install local LLM inference.

**Design:** Mirrors `experimental.html` exactly — no hardcoded model lists, no complex cache tracking. Models are loaded dynamically from `webllm.prebuiltAppConfig.model_list`.

**Key functions:**
- `wImport()` — Dynamically `import()`s the WebLLM module from CDN with multi-mirror fallback.
- `wllmPopulateDropdown()` — Fetches the full model catalog and populates `#wllm-model-selection`.
- `wLoad()` — Reads selected model, instantiates `MLCEngine`, calls `engine.reload()` with progress callback. Registers the model in the `st.mods` router.
- `wLlm(system, user, temp, isChat, onChunk)` — Streaming inference via `engine.chat.completions.create({ stream: true })`.
- `wUnload()` — Releases the engine and frees GPU memory.

---

### `telegram.js` — Autonomous Telegram Hub

Manages all Telegram bot interactions — polling, user ingestion, cross-dispatch, and file delivery.

**Key functions:**
- `tgPoll()` — Interval-based polling using `getUpdates`. Implements an exclusive **tab lock** via `localStorage` to prevent `409 Conflict` when multiple tabs are open.
- `tgXc(msg, token, fileCtx)` — Full message handler. Builds context (known-user list, VFS state, memory), calls `llm()`, then post-processes the response for `<tg_send>`, `<tg_doc>`, and `<media>` tags.
- `tgSendDoc(chatId, filePath)` — Uploads a VFS file (Base64 image or plain text) to Telegram `sendDocument` as a `Blob` attachment.
- `tgTakeControl()` — Manual lock acquisition for the current tab.

---

### `browser.js` — AI-Controllable Browser Panel

Provides the Browser tab UI logic and exposes functions callable by the AI via `vfs.js`.

**Key functions:**
- `browserGo()` — Navigates to URL or renders HTML blob in the `#browser-frame` iframe.
- `browserRunJs()` — Evaluates code from `#browser-js-in` in the iframe's `contentWindow`, logs result.
- `browserScrape()` — Extracts `document.title` + `body.innerText` from the iframe and writes to `/workspace/scrape_result.txt`.
- `browserScreenshot(outPath, tgChatId)` — Captures the iframe using `html2canvas`, saves to VFS, and optionally dispatches to Telegram via `tgSendDoc`.
- `browserOpenUrl(url)` — Public hook called by the `<browser_open>` tag parser in `vfs.js`; activates the Browser tab automatically.

---

### `app.js` — UI Initialization & Bindings

Entry point. Orchestrates the boot sequence and all DOM event bindings.

**Boot sequence:**
1. `lucide.createIcons()` — Render all icon SVGs
2. `navigator.storage.persist()` — Request persistent storage quota
3. `ld()` — Restore state from IndexedDB
4. `uiMod()` — Render the model list in the Models tab
5. `bind()` — Attach all event listeners (send button, file upload, tab switching, etc.)
6. `wllmInit()` — WebGPU check + populate WebLLM model dropdown
7. `memInit()` — Start memory compression timer
8. `tgTog()` — Resume Telegram polling if previously enabled

---

## Agentic XML Skills

The AI is trained via `D_SKIL` (in `state.js`) to use these XML tags in its responses. Each tag is parsed by `psVfs()` in `vfs.js`.

| Tag | Description |
|-----|-------------|
| `<file path='/workspace/file.ext'>content</file>` | Write or overwrite a file in the VFS |
| `<plan>[ ] Step 1\n[ ] Step 2</plan>` | Render a real-time execution flowchart in the Tracking tab |
| `<render_html file='...' out='...'><html/></render_html>` | Render inline HTML to a JPEG image via `html2canvas` |
| `<delegate task='...' temp='0.1'>prompt</delegate>` | Spawn a sub-agent LLM call at a custom temperature |
| `<tg_send chat_id="ID">message</tg_send>` | Send plain text to a Telegram user |
| `<tg_doc chat_id="ID">/workspace/file.ext</tg_doc>` | Upload a VFS file to a Telegram user as a document |
| `<browser_open url="https://..."/>` | Open a URL in the Browser panel iframe |
| `<browser_js>document.title</browser_js>` | Run JavaScript inside the iframe and log the result |
| `<browser_screenshot out="/workspace/screen.jpg" [tg_chat_id="ID"]/>` | Screenshot the iframe, save to VFS, optionally dispatch to Telegram |
| `<media type="image\|audio\|video" url="..."/>` | Render media inline in the chat UI |

---

## UI Tabs

| Tab | Panel ID | Description |
|-----|----------|-------------|
| Chat | `#p-chat` | Main conversational AI interface with file attachment support |
| Workspace | `#p-ide` | Two-pane VFS editor: System files and Workspace files |
| Core Data | `#p-id` | AI personality editor, skills editor, memory viewer |
| Models | `#p-mod` | Cloud API model manager + Local Browser Compute (WebLLM) |
| Tracking | `#p-activity` | Live AI pipeline timeline: logs, plans, events |
| Browser | `#p-browser` | Sandboxed iframe viewer + JS Console for AI-controlled browsing |
| SysLog | `#p-term` | Raw system log terminal |
| Channeling | `#p-cfg` | Telegram configuration, user directory, API token management |

---

## Quick Start

KREASYS requires no build system. Serve any static file server over HTTPS or localhost.

```bash
git clone https://github.com/KREASIOKA/KREASYS
cd KREASYS
python3 -m http.server 8080
```

Open `http://localhost:8080` in **Chrome 113+** or **Edge 113+** for full WebGPU support.

For cloud models, go to the **Models** tab, add a provider (e.g., OpenRouter), enter your API key and model name, and start chatting.

For local inference, open the **Models** tab, scroll to "Local Browser Compute", select any model from the dropdown, and click **Download & Load**.

---

## Configuration

All configuration is persisted automatically to IndexedDB (`localforage` key: `ksa`). There is no `.env` file.

| Setting | Location | Description |
|---------|----------|-------------|
| API Keys | Models tab | Per-model API key stored in `st.mods[i].k` |
| Telegram Token | Channeling tab | `st.cfg.tg` — Bot token for polling |
| Temperature | Models tab | `st.cfg.tmp` — Global inference temperature |
| AI Personality | Core Data tab | `/system/personality.md` in VFS |
| AI Skills | Core Data tab | `/system/skills.md` in VFS — Editable `D_SKIL` prompt |

---

## Contributors

We welcome contributions to advance the frontier of browser-native AI!

<div align="center">
  <a href="https://github.com/KREASIOKA/KREASYS/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=KREASIOKA/KREASYS" alt="Contributors Widget" />
  </a>
</div>

---

<p align="center">
  Maintained by the <b>KREASIOKA Team</b><br>
  <a href="https://www.kreasioka.com">www.kreasioka.com</a> · <a href="https://www.linkedin.com/company/kreasioka/">LinkedIn</a>
</p>
