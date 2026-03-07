Model that would be used in this project = z-ai/glm-4.5-air:free

API KEY = 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

# OpenClaw-Web (Browser Edition)
**A 100% Local-First, Multi-Agent AI Orchestrator that runs entirely in the browser.**

## 🚀 Vision
To provide a private, tunable, 24/7 AI employee that requires zero installation beyond an HTML file. No Node.js, no Docker—just your browser and your API keys.

## 🛠 Tech Stack
- **Frontend:** HTML5, Tailwind CSS (via CDN), Lucide Icons.
- **Persistence:** IndexedDB (via `localforage.js`) for massive JSON storage without RAM lag.
- **Orchestration:** Vanilla ES6 JavaScript + Web Workers (for 24/7 background tasks).
- **Communication:** Standard `fetch()` API for OpenRouter and Ollama.
- **Rendering:** Sandboxed `<iframe>` for real-time HTML/CSS/JS previewing.

## 🤖 The Agent Pipeline
1. **Planner:** Breaks user input into a JSON task list.
2. **Prompt Engineer:** Turns tasks into hyper-specific AI instructions.
3. **Executor:** Writes the actual code or performs the logic.
4. **Checker:** Validates the output (Syntax check / Logic check).
5. **Reviser:** Corrects errors if the Checker finds any.
6. **Reporter:** Generates a final status update for the dashboard.

## 📁 Data Structure
All agent personalities, settings, and task memories are stored in JSON format within the browser's IndexedDB. The app is 100% tunable via the `agents.json` configuration panel.

I want to create a webapp that can be installed locally and run in a browser by the user, and I will make this project open source. However, I also want this AI agent to have automation features! How do I do that? I want this AI to be 100% tunable, and all templates and settings will be stored in JSON files!

Please explain as thoroughly and as simply as possible to understand without exception, because I want to build the application using HTML, CSS, JS, JSON, CDN, Tailwind, and others without NodeJS, only tasks are divided for the AI, so that the tasks created have a complete structure. So, the user will have a personal employee that runs 100% in the browser! I want it to have a webUI for the complete dashboard, HTML canvas, an automatic HTML previewer (if the user wants to create any design by asking the AI ​​to use HTML), and do anything! The AI ​​must be able to run 24/7 without errors, and there must be no memory overload due to the browser! Use local storage instead of storing data in RAM, as that would be incredibly heavy!

I'd like you to explain to me what technologies should be implemented, starting with the AI ​​that creates task plans, the agent prompt engineer for each task, and the agent that executes the task, the agent that checks the task, the agent that revises it for any errors (if any), and the agent that generates a final report for the user regarding the task performed. Similar to the Google Antigravity app, but with user-provided AI like ollama/openrouter/other AI providers!