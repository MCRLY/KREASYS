# Changelog

All notable changes to the **KREASYS** project will be documented in this file.

## [0.3.1] - 2026-03-07
### Fixed
- **`<render_html>` VFS Race Condition**: The AI now embeds HTML inline directly inside `<render_html>...</render_html>` block tags. Previously, calling `<render_html>` after a separate `<file>` write caused a race condition where the file wasn't yet in the VFS. The renderer now falls back to any inline HTML content, making image generation reliable in a single AI turn.
- **WebGPU Hard Block Removed**: Strict WebGPU hardware check in `webllm.js` was converted from a hard failure (`return;`) to a soft warning. Users can now attempt any model download regardless of the GPU probe result.
- **Script Cache Busting**: All core JS script tags in `index.html` include version query strings (`?v=3`) to prevent users from loading stale cached code.
- **AI Streaming Enabled**: `llm()` refactored to use `fetch` Body.getReader() Server-Sent Events streaming. Both the Cloud APIs and local WebGPU engine now stream tokens progressively to the Chat UI in real-time.

## [0.3.0] - 2026-03-07
### Added
- **Browser-Native HTML-to-Image Rendering**: Implemented the `<render_html>` XML command using `html2canvas`.
- **Sub-Agent Delegation**: Introduced the `<delegate task="..." temp="...">` command for sequential autonomous task execution.
- **Workflow Planning Enforcer**: The System Prompt strictly enforces usage of `<plan>` tags for complex requests.

## [0.2.1] - 2026-03-01
### Added
- **Single-Instance Telegram Polling**: Introduced a `tg_lock` logic utilizing localStorage and randomly generated Tab IDs. This ensures only a single dashboard tab actively polls the Telegram API, completely mitigating `409 Conflict: terminated by other getUpdates request` errors.
- **"Channeling" Dashboard UI**: Refactored the 'Integrations' tab into a modern 'Channeling' hub. Prepared grayed-out UI placeholders for future Instagram Business and Facebook Messenger integrations.
- **UI "Take Control" Override**: Users can now click "Take Control" in inactive tabs to steal the Telegram polling lock from other hidden tabs.

## [0.2.0] - 2026-02-28
### Added
- **Local AI Ecosystem Tab**: Decoupled WebLLM from the standard API router. Created a dedicated "Local AI" tab for managing, downloading, and chatting with local WebGPU models (Llama, Phi, etc.).
- **Dual-Layer Persistent Memory**: Replaced the infinitely expanding session log with a Smart Memory System. The AI now actively summarizes `/system/memory.log` into `/system/memory.md` during idle periods (60s inactivity), preventing context window blowouts and reducing hallucinations.
- **Telegram Autonomous Hub**: The bot now automatically registers Telegram users engaging with the agent. The AI can be instructed by an admin to autonomously message *other* registered users via cross-user dispatch mapping.

## [0.1.0] - Alpha Release
### Added
- **Virtual File System (VFS)**: Integrated `localforage.js` to build a persistent, memory-mapped DOM file system without a backend database.
- **Multi-Modal API Router**: Developed the dynamic `ai.js` router capable of dispatching workloads across OpenRouter, Groq, NVIDIA NIM, OpenAI, Hugging Face, Anthropic, and Local instances.
- **Telegram Webhook Core**: First iteration of Telegram background polling and file-attachment parsing.
- **Visual Task Tracking**: Basic implementation of the flowchart UI reading `<plan>` tags output by the LLM.
