let wEngine = null;
let wStatus = 'idle';
let wModel = null;
let webllmLib = null;

async function wImport() {
    if (webllmLib) return webllmLib;
    const cdnUrls = [
        'https://esm.run/@mlc-ai/web-llm',
        'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm',
        'https://esm.sh/@mlc-ai/web-llm'
    ];
    let lastErr;
    for (const url of cdnUrls) {
        try {
            lg('SYS', `WebLLM: Loading module from ${url}…`);
            webllmLib = await import(url);
            lg('SYS', 'WebLLM: Module loaded.');
            return webllmLib;
        } catch (e) {
            lg('SYS', `WebLLM: CDN ${url} failed — trying next.`);
            lastErr = e;
        }
    }
    throw new Error(`WebLLM CDN import failed on all mirrors: ${lastErr?.message}`);
}

function wIsReady() { return wStatus === 'ready' && wEngine !== null; }
function wActiveModel() { return wModel; }

function wUpdateStatusPill() {
    const pill = document.getElementById('wllm-status');
    const label = document.getElementById('wllm-status-label');
    if (!pill) return;
    const colors = { idle: 'var(--dim)', loading: 'var(--ac2)', ready: 'var(--ok)', error: 'var(--err)' };
    const labels = { idle: 'Idle', loading: 'Downloading…', ready: `Active: ${wModel || '?'}`, error: 'Error' };
    pill.style.background = colors[wStatus] || 'var(--dim)';
    if (label) label.textContent = labels[wStatus] || wStatus;
}

function wUpdateProgress(status, progress, text) {
    wStatus = status;
    const bar = document.getElementById('wllm-progress-bar');
    const barWrap = document.getElementById('wllm-progress-wrap');
    const barLbl = document.getElementById('wllm-progress-label');
    if (barWrap) barWrap.style.display = (status === 'loading') ? 'block' : 'none';
    if (bar && progress !== undefined) bar.style.width = Math.min(100, Math.round(progress * 100)) + '%';
    if (barLbl && text) barLbl.textContent = text;
    wUpdateStatusPill();
}

function wShowError(msg) {
    wStatus = 'error';
    wUpdateStatusPill();
    const barWrap = document.getElementById('wllm-progress-wrap');
    const barLbl = document.getElementById('wllm-progress-label');
    const bar = document.getElementById('wllm-progress-bar');
    if (barWrap) barWrap.style.display = 'block';
    if (bar) { bar.style.width = '100%'; bar.style.background = 'var(--err)'; }
    if (barLbl) barLbl.textContent = msg;
    setTimeout(() => {
        if (barWrap) barWrap.style.display = 'none';
        if (bar) bar.style.background = 'linear-gradient(90deg,var(--ac2),var(--ac))';
    }, 8000);
}

async function wllmPopulateDropdown() {
    const sel = document.getElementById('wllm-model-selection');
    if (!sel) return;
    try {
        const lib = await wImport();
        const models = lib.prebuiltAppConfig.model_list.map(m => m.model_id);
        sel.innerHTML = '';
        models.forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = id;
            sel.appendChild(opt);
        });
        const preferred = 'Llama-3.2-3B-Instruct-q4f32_1-MLC';
        if (models.includes(preferred)) sel.value = preferred;
    } catch (e) {
        lg('ERR', `WebLLM: Failed to load model list — ${e.message}`);
        const opt = document.createElement('option');
        opt.textContent = 'Error loading models';
        sel.appendChild(opt);
    }
}

async function wLoad() {
    const sel = document.getElementById('wllm-model-selection');
    const modelId = sel ? sel.value : null;
    if (!modelId) { lg('ERR', 'WebLLM: No model selected.'); return; }
    if (wStatus === 'loading') { lg('SYS', 'WebLLM: A model is already loading. Please wait.'); return; }

    if (wEngine) { try { await wEngine.unload(); } catch (_) { } wEngine = null; }
    wModel = modelId;
    wUpdateProgress('loading', 0, 'Starting download…');
    lg('SYS', `WebLLM: Loading "${modelId}"…`);

    try {
        const lib = await wImport();
        wEngine = new lib.MLCEngine();
        wEngine.setInitProgressCallback((report) => {
            const pct = Math.round((report.progress || 0) * 100);
            const text = report.text ? `${report.text} (${pct}%)` : `Downloading… ${pct}%`;
            wUpdateProgress('loading', report.progress || 0, text);
        });
        await wEngine.reload(modelId, { temperature: 1.0, top_p: 1 });
        wUpdateProgress('ready', 1, '');
        const bar = document.getElementById('wllm-progress-bar');
        if (bar) bar.style.background = 'linear-gradient(90deg,var(--ac2),var(--ac))';
        wUpdateStatusPill();
        lg('SYS', `WebLLM: "${modelId}" is ready. Local inference active.`);
        if (typeof showToast === 'function') showToast('Local AI Ready', modelId);

        const existing = st.mods.find(m => m.p === 'webllm');
        if (existing) { existing.m = modelId; existing.n = 'Local AI: ' + modelId; }
        else { st.mods.unshift({ id: 'wllm-local', n: 'Local AI: ' + modelId, p: 'webllm', m: modelId, k: '', e: '', t: 'text' }); }
        await svGlb();
        if (typeof uiMod === 'function') uiMod();
    } catch (e) {
        const userMsg = e.message.includes('GPU') || e.message.includes('WebGPU')
            ? 'WebGPU error — ensure your browser supports WebGPU and GPU drivers are up to date. Try a Tiny model first.'
            : e.message;
        wShowError(userMsg);
        wEngine = null; wModel = null;
        lg('ERR', 'WebLLM Load Error: ' + e.message);
    }
}

async function wUnload() {
    if (wEngine) { try { await wEngine.unload(); } catch (_) { } wEngine = null; }
    wModel = null; wStatus = 'idle';
    wUpdateStatusPill();
    lg('SYS', 'WebLLM: Engine unloaded. GPU memory freed.');
}

async function wLlm(systemPrompt, userMsg, temperature = 0.7, isChat = false, onChunk = null) {
    if (!wEngine || wStatus !== 'ready') {
        throw new Error('No local model loaded. Go to Models tab and select a model first, then click Download & Load.');
    }
    const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }];
    if (isChat || onChunk) {
        let full = '';
        const chunks = await wEngine.chat.completions.create({ messages, temperature, stream: true });
        for await (const chunk of chunks) {
            const txt = chunk.choices[0]?.delta?.content || '';
            if (txt) { full += txt; if (onChunk) onChunk(txt, full); }
        }
        return full;
    } else {
        const r = await wEngine.chat.completions.create({ messages, temperature });
        return r.choices?.[0]?.message?.content || '';
    }
}
