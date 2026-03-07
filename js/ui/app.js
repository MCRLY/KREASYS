async function boot() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist() } catch (e) { }
    if (window.innerWidth > 768) $('#st-ram-w').style.display = 'inline-flex';
    await ld();
    uiMod();
    bind();
    wllmInit();
    if (typeof memInit === 'function') memInit();
    setInterval(hlth, 1000);
    if (st.cfg.auto) tgTog();
    lg('SYS', 'KREASYS Core Initialized. VFS Data securely segregated. Memory system active.');
    ckDb();
}

let pendingAttachment = null;
let deferredInstallPrompt = null;

function bind() {
    $$('.nav-tab').forEach(t => t.onclick = () => { $$('.nav-tab').forEach(x => x.classList.remove('active')); $$('.panel').forEach(x => x.classList.remove('active')); t.classList.add('active'); $(`#${t.dataset.target}`).classList.add('active') });
    const h = function () { this.style.height = '50px'; this.style.height = Math.min(this.scrollHeight, 150) + 'px' };
    $('#c-in').oninput = h; $('#t-in').oninput = h;
    const x = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!st.run) { if (e.target.id === 'c-in') sendChat(); else xc($('#t-in').value, 0) } } };
    $('#c-in').onkeydown = x; $('#t-in').onkeydown = x;
    $('#btn-run-c').onclick = () => sendChat();
    $('#btn-run-t').onclick = () => xc($('#t-in').value, 0);
    $('#btn-stop-c').onclick = () => st.run = 0;
    const attachBtn = $('#btn-attach');
    if (attachBtn) attachBtn.onclick = () => $('#chat-file-in').click();
    const fileIn = $('#chat-file-in');
    if (fileIn) fileIn.onchange = e => handleAttach(e);
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstallPrompt = e; const btn = $('#btn-install'); if (btn) btn.style.display = 'flex'; });
    window.addEventListener('appinstalled', () => { const btn = $('#btn-install'); if (btn) btn.style.display = 'none'; deferredInstallPrompt = null; lg('SYS', 'KREASYS installed as PWA.'); });
}

function sendChat() {
    const q = $('#c-in').value;
    if (!q.trim() && !pendingAttachment) return;
    xc(q, 1, pendingAttachment);
    pendingAttachment = null;
    const prev = $('#attach-preview');
    if (prev) prev.remove();
}

function handleAttach(e) {
    const file = e.target.files[0];
    if (!file) return;
    const isText = file.type.startsWith('text/') || /\.(md|js|py|json|html|css|ts|jsx|txt|csv|xml|yaml|yml)$/i.test(file.name);
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = ev => {
        pendingAttachment = { name: file.name, type: file.type, size: file.size, isText, content: isText ? ev.target.result : null, dataUrl: isImage ? ev.target.result : null };
        const existing = $('#attach-preview'); if (existing) existing.remove();
        const chip = document.createElement('div');
        chip.id = 'attach-preview';
        chip.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(0,179,255,0.1);border:1px solid rgba(0,179,255,0.3);border-radius:8px;font-size:12px;color:var(--ac2);flex-shrink:0;';
        if (isImage) { const thumb = document.createElement('img'); thumb.src = ev.target.result; thumb.style.cssText = 'width:42px;height:42px;border-radius:5px;object-fit:cover;flex-shrink:0;'; chip.appendChild(thumb); }
        chip.innerHTML += `<i data-lucide="paperclip" style="width:13px;height:13px;flex-shrink:0"></i><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${file.name}</span><i data-lucide="x" style="width:13px;height:13px;cursor:pointer;color:var(--err);flex-shrink:0" onclick="pendingAttachment=null;document.getElementById('attach-preview').remove();document.getElementById('chat-file-in').value=''"></i>`;
        const bar = $('#c-in').closest ? $('#c-in').parentElement.parentElement : null;
        if (bar) bar.insertBefore(chip, bar.firstChild);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
    if (isText) reader.readAsText(file); else reader.readAsDataURL(file);
    e.target.value = '';
}

function uiMod() {
    const p = $('#mod-list'); p.innerHTML = '';
    st.mods.forEach(m => {
        const d = document.createElement('div'); d.className = 'mod-row'; d.dataset.id = m.id;
        const isC = (m.p === 'custom') ? 'block' : 'none';
        const provOptions = [
            ['openrouter', 'OpenRouter'],
            ['groq', 'Groq'],
            ['nvidia', 'NVIDIA NIM'],
            ['openai', 'OpenAI'],
            ['anthropic', 'Anthropic'],
            ['huggingface', 'HuggingFace'],
            ['ollama', 'Ollama (Local)'],
            ['custom', 'Custom Endpoint']
        ].map(([v, label]) => `<option value="${v}" ${m.p === v ? 'selected' : ''}>${label}</option>`).join('');

        // For non-custom providers, show a soft hint with the endpoint URL
        const endpointHint = (typeof PRV_HINTS !== 'undefined' && PRV_HINTS[m.p]) ? PRV_HINTS[m.p] : '';

        d.innerHTML = `
<div class="mod-hdr">
  <input class="mn" value="${m.n}" placeholder="Alias (e.g. My Fast Groq)" style="flex:1;min-width:150px">
  <button class="btn okc" onclick="tstMod('${m.id}')" style="padding:6px 10px"><i data-lucide="radio"></i> Test</button>
  <button class="btn primary" onclick="svMod('${m.id}')" style="padding:6px 10px"><i data-lucide="save"></i> Save</button>
  <button class="btn err dtb" onclick="rmMod('${m.id}')" style="padding:6px 10px"><i data-lucide="trash-2"></i></button>
</div>
<div class="mod-cfg">
  <select class="mp" onchange="chgPrv(this,'${m.id}')">${provOptions}</select>
  <select class="mt">
    <option value="text"      ${(m.t || 'text') === 'text' ? 'selected' : ''}>Text</option>
    <option value="multimodal" ${m.t === 'multimodal' ? 'selected' : ''}>Multimodal</option>
    <option value="vision"    ${m.t === 'vision' ? 'selected' : ''}>Vision</option>
    <option value="image"     ${m.t === 'image' ? 'selected' : ''}>ImageGen</option>
    <option value="audio"     ${m.t === 'audio' ? 'selected' : ''}>Audio</option>
    <option value="video"     ${m.t === 'video' ? 'selected' : ''}>Video</option>
  </select>
  <input class="mm" value="${m.m}" placeholder="Model ID (e.g. llama-3.1-8b-instant)">
  <input type="password" class="mk" value="${m.k}" placeholder="API Key${m.p === 'ollama' ? ' (not required for local)' : ''}">
</div>
<div class="me-wrap">
  <input class="me" value="${m.e || ''}" placeholder="${endpointHint}" style="display:${isC};font-size:12px;color:var(--dim)">
  ${m.p !== 'custom' ? `<div class="me-hint" style="font-size:11px;color:var(--dim);padding:4px 0;opacity:0.7">${endpointHint}</div>` : ''}
</div>`;
        p.appendChild(d);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function chgPrv(s, id) {
    const r = $(`.mod-row[data-id="${id}"]`);
    const meInput = $('.me', r);
    const hint = (typeof PRV_HINTS !== 'undefined' && PRV_HINTS[s.value]) ? PRV_HINTS[s.value] : '';
    if (s.value === 'custom') {
        meInput.style.display = 'block';
        meInput.placeholder = 'Enter your custom endpoint URL here';
    } else {
        meInput.style.display = 'none';
    }
    // Update the hint display
    const hintEl = $('.me-hint', r);
    if (hintEl) { hintEl.textContent = hint; hintEl.style.display = hint ? '' : 'none'; }
    // Update key placeholder for Ollama
    const mkInput = $('.mk', r);
    if (mkInput) mkInput.placeholder = s.value === 'ollama' ? 'API Key (not required for local)' : 'API Key';
}

function addModUI() { st.mods.push({ id: genId(), n: '', p: 'openrouter', m: '', k: '', e: '', t: 'text' }); uiMod() }

async function svMod(id) {
    const r = $(`.mod-row[data-id="${id}"]`); const m = st.mods.find(x => x.id === id);
    if (m) {
        m.n = $('.mn', r).value; m.p = $('.mp', r).value; m.t = $('.mt', r).value; m.m = $('.mm', r).value; m.k = $('.mk', r).value; m.e = $('.me', r).value;
        const b = $('.primary', r); b.innerHTML = '<i data-lucide="check"></i> Saved'; if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => { b.innerHTML = '<i data-lucide="save"></i> Save'; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 1500);
        await svGlb();
    }
}

function rmMod(id) { if (st.mods.length > 1) { st.mods = st.mods.filter(m => m.id !== id); uiMod(); svGlb() } }

async function tstMod(id) {
    const r = $(`.mod-row[data-id="${id}"]`);
    // Read live values from the form (no save required before testing)
    const tm = {
        id,
        n: $('.mn', r).value || 'Unnamed',
        p: $('.mp', r).value,
        m: $('.mm', r).value,
        k: $('.mk', r).value,
        e: $('.me', r).value
    };
    const b = $('.okc', r);
    b.innerHTML = '<i data-lucide="loader"></i> Pinging...'; if (typeof lucide !== 'undefined') lucide.createIcons();
    try {
        const res = await llm('You are a test assistant. Respond with exactly: OK', 'Respond OK', tm);
        if (res.trim().toUpperCase().includes('OK')) {
            b.innerHTML = '<i data-lucide="check"></i> PASS'; b.className = 'btn okc'; lg('SYS', `[${tm.n}] API test PASS.`);
        } else {
            b.innerHTML = '<i data-lucide="alert-triangle"></i> WARN'; b.className = 'btn'; lg('SYS', `[${tm.n}] WARN — Unexpected response: ${res.substring(0, 100)}`);
        }
    } catch (e) {
        b.innerHTML = '<i data-lucide="x"></i> FAIL'; b.className = 'btn err'; lg('ERR', `[${tm.n}] FAIL: ${e.message}`);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => { b.innerHTML = '<i data-lucide="radio"></i> Test'; b.className = 'btn okc'; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 3000);
}

function ckDb() { localforage.length().then(c => $('#st-db').className = c > 0 ? 'dot ok' : 'dot err').catch(() => $('#st-db').className = 'dot err') }

function showToast(msg, filePath) {
    const c = $('#toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<i data-lucide="bell"></i> <div><b>${msg}</b><br><span style="font-size:11px;color:var(--dim)">${filePath}</span></div>`;

    t.onclick = () => {
        const wTab = $$('.nav-tab').find(x => x.dataset.target === 'p-ide');
        if (wTab) wTab.click();

        setTimeout(() => {
            const items = $$('.ide-tree-item');
            const target = items.find(x => x.querySelector('span').title === filePath);
            if (target) {
                target.click();
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);

        t.classList.remove('show');
        setTimeout(() => t.remove(), 400);
    };

    c.appendChild(t);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    requestAnimationFrame(() => t.classList.add('show'));

    setTimeout(() => {
        if (t.parentNode) {
            t.classList.remove('show');
            setTimeout(() => { if (t.parentNode) t.remove(); }, 400);
        }
    }, 5000);
}

function renderPlan(steps) {
    const c = $('#activity-timeline');
    if (!c) return;

    // Remove empty placeholder if any
    if (c.innerHTML.includes('waiting for events')) c.innerHTML = '';

    // Find or create the flowchart block in timeline
    let flowBlock = $('#activity-flowchart', c);
    if (!flowBlock) {
        flowBlock = document.createElement('div');
        flowBlock.id = 'activity-flowchart';
        flowBlock.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:16px;background:rgba(0,179,255,0.05);border:1px solid rgba(0,179,255,0.2);border-radius:12px;margin-bottom:12px;';
        c.appendChild(flowBlock);
    }

    flowBlock.innerHTML = '<div style="font-size:11px;color:var(--ac2);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px"><i data-lucide="git-branch" style="width:12px;display:inline;vertical-align:middle;margin-right:4px"></i> Active execution plan</div>';

    const trackDom = document.createElement('div');
    trackDom.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:8px;';

    steps.forEach((s, idx) => {
        const d = document.createElement('div');
        d.style.cssText = `display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;`;

        let icon = 'circle';
        if (s.status === 'done') {
            icon = 'check-circle';
            d.style.background = 'rgba(57,255,20,0.15)';
            d.style.color = 'var(--ok)';
            d.style.border = '1px solid rgba(57,255,20,0.4)';
        } else if (s.status === 'active') {
            icon = 'loader';
            d.style.background = 'rgba(0,179,255,0.15)';
            d.style.color = 'var(--ac2)';
            d.style.border = '1px solid rgba(0,179,255,0.4)';
        } else {
            d.style.background = 'rgba(255,255,255,0.05)';
            d.style.color = 'var(--dim)';
            d.style.border = '1px solid rgba(255,255,255,0.1)';
        }

        d.innerHTML = `<i data-lucide="${icon}" style="width:14px;height:14px"></i><span>${s.name}</span>`;
        trackDom.appendChild(d);

        if (idx < steps.length - 1) {
            const a = document.createElement('i');
            a.setAttribute('data-lucide', 'arrow-right');
            a.style.width = '14px';
            a.style.height = '14px';
            a.style.color = 'var(--dim)';
            trackDom.appendChild(a);
        }
    });

    flowBlock.appendChild(trackDom);
    c.scrollTop = c.scrollHeight;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function psPlan(ctx) {
    const m = ctx.match(/<plan>([\s\S]*?)<\/plan>/i);
    if (!m) {
        const flowBlock = $('#activity-flowchart');
        if (flowBlock) flowBlock.style.display = 'none';
        return;
    }

    const steps = [];
    const stepRg = /<step\s+status=["']([^"']+)["']>([\s\S]*?)<\/step>/gi;
    let sm;
    while ((sm = stepRg.exec(m[1])) !== null) {
        steps.push({ status: sm[1].toLowerCase(), name: sm[2].trim() });
    }

    if (steps.length > 0) renderPlan(steps);
    else {
        const flowBlock = $('#activity-flowchart');
        if (flowBlock) flowBlock.style.display = 'none';
    }
}

function lg(r, c) {
    const w = $('#t-log'), e = document.createElement('div'); e.className = 'msg';
    if (r === 'SYS' || r === 'ERR') c = `[${new Date().toLocaleTimeString()}] ${c}`;
    const h = (typeof marked !== 'undefined') ? marked.parse(c) : c;
    e.innerHTML = `<div class="msg-role ${r}">${r}</div><div class="msg-ctx">${h}</div>`;
    w.appendChild(e); w.scrollTop = w.scrollHeight;

    // Also push to Activity Tracking visualizer
    const actTl = $('#activity-timeline');
    if (actTl && (r === 'SYS' || r === 'ERR' || r === 'AGT')) {
        if (actTl.innerHTML.includes('waiting for events')) actTl.innerHTML = '';
        const a = document.createElement('div');
        const isErr = r === 'ERR';
        const isSys = r === 'SYS';

        a.style.cssText = `display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:${isErr ? 'rgba(255,74,74,0.05)' : 'rgba(255,255,255,0.02)'};border:1px solid ${isErr ? 'rgba(255,74,74,0.3)' : 'rgba(255,255,255,0.05)'};border-radius:10px;animation:fade-in 0.3s ease;`;

        let actIcon = 'zap';
        if (isErr) actIcon = 'alert-triangle';
        else if (c.includes('VFS written')) actIcon = 'save';
        else if (c.includes('Delegating')) actIcon = 'git-pull-request';
        else if (c.includes('Render complete')) actIcon = 'image';
        else if (c.includes('Autonomous Dispatch')) actIcon = 'send';
        else if (r === 'AGT') actIcon = 'bot';

        a.innerHTML = `<div style="padding:6px;background:${isErr ? 'var(--err)' : (isSys ? 'var(--ac2)' : 'var(--ac)')};border-radius:8px;color:#000;flex-shrink:0"><i data-lucide="${actIcon}" style="width:16px;height:16px"></i></div>
                       <div style="flex:1"><div style="font-size:11px;color:var(--dim);font-weight:600;margin-bottom:4px">${new Date().toLocaleTimeString()} • ${r}</div>
                       <div style="font-size:13px;color:var(--txt);line-height:1.5">${h}</div></div>`;
        actTl.appendChild(a);
        actTl.scrollTop = actTl.scrollHeight;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    if (r === 'SYS' || r === 'AGT' || r === 'ERR') {
        let m = st.vfs['/system/memory.log'] || '';
        m += `[${new Date().toISOString()}] ${r}: ${c.substring(0, 500)}\n`;
        if (m.length > 50000) m = m.substring(m.length - 50000);
        st.vfs['/system/memory.log'] = m; svGlb();
        if (st.cfn.sys === '/system/memory.log') $('#vfs-ed-sys').value = m;
    }
}
function renderMedia(raw) {
    // Render <media type="image|audio|video" url="..."/> tags from AI responses
    return raw.replace(/<media\s+type=["'](image|audio|video)["']\s+url=["']([^"']+)["']\s*\/?>/gi, (_, type, url) => {
        if (type === 'image') return `<img src="${url}" style="max-width:100%;border-radius:10px;margin-top:10px;box-shadow:0 4px 20px rgba(0,0,0,0.4)" loading="lazy" alt="AI Generated Image">`;
        if (type === 'audio') return `<audio controls style="width:100%;margin-top:10px;border-radius:8px"><source src="${url}">Your browser does not support audio.</audio>`;
        if (type === 'video') return `<video controls style="max-width:100%;border-radius:10px;margin-top:10px"><source src="${url}">Your browser does not support video.</video>`;
        return '';
    });
}

function chLg(r, c, attachment) {
    const w = $('#c-log'), e = document.createElement('div');
    e.className = `msg ${r === 'USR' ? 'usr-msg' : 'agt-msg'}`;
    let attHtml = '';
    if (attachment) {
        if (attachment.isText) attHtml = `<div style="font-size:11px;color:var(--dim);margin-bottom:8px;padding:8px;background:rgba(0,179,255,0.05);border:1px solid rgba(0,179,255,0.2);border-radius:6px"><i data-lucide="file-text" style="width:12px;height:12px;margin-right:4px;display:inline-block;vertical-align:-2px"></i><b>${attachment.name}</b> (${(attachment.size / 1024).toFixed(1)}KB)</div>`;
        else attHtml = `<div style="font-size:11px;color:var(--dim);margin-bottom:8px;padding:8px;background:rgba(0,179,255,0.05);border:1px solid rgba(0,179,255,0.2);border-radius:6px"><i data-lucide="image" style="width:12px;height:12px;margin-right:4px;display:inline-block;vertical-align:-2px"></i><b>${attachment.name}</b> (${(attachment.size / 1024).toFixed(1)}KB) - Image attached</div>`;
    }
    const h = (typeof marked !== 'undefined') ? marked.parse(c) : c;
    const finalHtml = renderMedia(h);
    e.innerHTML = `<div class="msg-role ${r}">${r === 'USR' ? 'You' : 'Agent'}</div><div class="msg-ctx">${attHtml}${finalHtml}</div>`;
    w.appendChild(e); w.scrollTop = w.scrollHeight;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/** Pre-renders a chat bubble and returns the context DOM element for real-time text injection */
function chLgStream(r, initialContext) {
    const w = $('#c-log'), e = document.createElement('div');
    e.className = `msg ${r === 'USR' ? 'usr-msg' : 'agt-msg'}`;

    e.innerHTML = `<div class="msg-role ${r}">${r === 'USR' ? 'You' : 'Agent'}</div><div class="msg-ctx">${initialContext}</div>`;
    w.appendChild(e); w.scrollTop = w.scrollHeight;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    return e.querySelector('.msg-ctx');
}
function clearTerm() { $('#t-log').innerHTML = '' }

function hlth() {
    if (performance.memory && window.innerWidth > 768) $('#st-ram').innerText = `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`;
    $('#m-tk').innerText = st.tk; $('#m-ts').innerText = st.ts;
    const s = Math.floor((Date.now() - st.bt) / 1000);
    $('#m-up').innerText = `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
}

// Start sequence
boot();

function wllmInit() {
    if ('gpu' in navigator) {
        navigator.gpu.requestAdapter().then(a => {
            if (a) lg('SYS', `WebLLM: WebGPU adapter available.`);
            else {
                const warn = document.getElementById('wllm-gpu-warn');
                if (warn) warn.style.display = 'block';
                lg('SYS', 'WebLLM: No WebGPU adapter found. Models may still work on some browsers.');
            }
        }).catch(() => {
            const warn = document.getElementById('wllm-gpu-warn');
            if (warn) warn.style.display = 'block';
        });
    } else {
        const warn = document.getElementById('wllm-gpu-warn');
        if (warn) warn.style.display = 'block';
        lg('SYS', 'WebLLM: WebGPU is not available in this browser.');
    }
    if (typeof wllmPopulateDropdown === 'function') wllmPopulateDropdown();
}
