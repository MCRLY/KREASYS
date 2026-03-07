'use strict';
const $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => Array.from(e.querySelectorAll(s));

const PRV = {
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    huggingface: 'https://router.huggingface.co/v1/chat/completions',
    ollama: 'http://localhost:11434/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    custom: ''
};

const PRV_HINTS = {
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions',
    huggingface: 'https://router.huggingface.co/v1/chat/completions',
    ollama: 'http://localhost:11434/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    custom: 'Enter your custom endpoint URL here'
};

let st = {
    run: 0, tg: 0, poll: 0, id: 0, vfs: {}, tk: 0, ts: 0, bt: Date.now(), cfn: { sys: '', wrk: '' },
    cfg: { tg: '', auto: 0, tmp: 0.7, tgUsers: {}, wllmLib: {} },
    mods: [{ id: genId(), n: 'Default OpenRouter', p: 'openrouter', m: 'anthropic/claude-3-haiku', k: '', e: '', t: 'text' }]
};

const D_PERS = "You are KREASYS, a hyper-advanced autonomous browser AI. You run entirely locally in a strictly sandboxed environment. Your brain/config files are in `/system/`. All user projects, generated apps, and edited files MUST be strictly contained within `/workspace/` and its subdirectories. You act as a capable Agent who can break down complex problems and solve them step-by-step.";
const D_SKIL = "AGENTIC TOOLS (CRITICAL):\n1. WRITE FILES: Use <file path='/workspace/path/to/file.ext'>content</file> to create/edit user files.\n2. PLAN TRACKER: For any complex request, start your response with <plan>[ ] Step 1\n[ ] Step 2</plan>. This renders a UI flowchart for the user.\n3. HTML 2 IMAGE: To create a graphic/poster, use the block form of render_html in a SINGLE response. Write the HTML inline inside the tag, then set where to save the output:\n<render_html file='/workspace/poster.html' out='/workspace/poster.jpg'>\n<div style=\"width:1080px;font-family:sans-serif;background:#87CEEB\"><h1>My Design</h1></div>\n</render_html>\nThis is the ONLY correct way. Do NOT use a separate <file> tag for the HTML first.\n4. DELEGATE (SEQUENTIAL TASKS): To prevent context overload or hallucinations, separate large workflows using sub-agents. Use <delegate task='Analyze Data' temp='0.1'>Prompt</delegate>. The main agent will pause and wake up when done. Use lower temps (e.g., 0.1) for analysis tasks.\n5. TELEGRAM MESSAGES: To message a specific Telegram user, use <tg_send chat_id=\"CHAT_ID\">message</tg_send>.\n6. RICH MEDIA: To reply with media, use <media type=\"image|audio|video\" url=\"URL\"/>.\n7. Do NOT output markdown code blocks. ONLY use XML tags.";

function genId() { return Math.random().toString(36).substr(2, 9) }

async function ld() {
    const d = await localforage.getItem('ksa');
    if (d) {
        if (d.cfg) st.cfg = { tgUsers: {}, wllmLib: {}, ...st.cfg, ...d.cfg };
        if (d.vfs) st.vfs = d.vfs;
        if (d.mods) st.mods = d.mods.map(x => {
            if (x.k && x.k.includes('||')) {
                const [u, k] = x.k.split('||'); let p = 'custom';
                if (u.includes('openrouter')) p = 'openrouter';
                else if (u.includes('groq')) p = 'groq';
                else if (u.includes('nvidia')) p = 'nvidia';
                else if (u.includes('openai')) p = 'openai';
                else if (u.includes('huggingface')) p = 'huggingface';
                else if (u.includes('anthropic')) p = 'anthropic';
                else if (u.includes('localhost')) p = 'ollama';
                return { id: x.id, n: x.n, p, m: x.m, k, e: p === 'custom' ? u : '', t: x.t || 'text' };
            }
            return x.p ? { ...x, t: x.t || 'text' } : { id: x.id, n: x.n, p: 'openrouter', m: x.m, k: x.k, e: '', t: x.t || 'text' };
        });
    }
    if (!st.vfs['/system/personality.md']) st.vfs['/system/personality.md'] = D_PERS;
    if (!st.vfs['/system/skills.md']) st.vfs['/system/skills.md'] = D_SKIL;
    if (!st.vfs['/system/memory.log']) st.vfs['/system/memory.log'] = '';
    if (!st.vfs['/system/memory.md']) st.vfs['/system/memory.md'] = '';

    $('#c-tg').value = st.cfg.tg;
    $('#c-auto').checked = st.cfg.auto;
    $('#c-tmp').value = st.cfg.tmp;
    $('#c-tmp').nextElementSibling.innerText = st.cfg.tmp;
    rVfs();
    renderTgUsers();
}

async function svGlb() {
    st.cfg.tg = $('#c-tg').value;
    st.cfg.tmp = parseFloat($('#c-tmp').value);
    await localforage.setItem('ksa', { cfg: st.cfg, mods: st.mods, vfs: st.vfs });
    ckDb();
}

function ckDb() { localforage.length().then(c => $('#st-db').className = c > 0 ? 'dot ok' : 'dot err').catch(() => $('#st-db').className = 'dot err') }

function renderTgUsers() {
    const container = document.getElementById('tg-users-list');
    if (!container) return;
    const users = st.cfg.tgUsers || {};
    const entries = Object.entries(users);
    if (entries.length === 0) {
        container.innerHTML = '<div style="font-size:12px;color:var(--dim);padding:10px 0">No users yet. Users are auto-registered when they message the bot.</div>';
        return;
    }
    container.innerHTML = entries.map(([name, chatId]) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:6px">
            <i data-lucide="user" style="width:14px;height:14px;color:var(--ac2);flex-shrink:0"></i>
            <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:var(--txt)">${name}</div>
                <div style="font-size:11px;color:var(--dim)">Chat ID: <code style="color:var(--ac)">${chatId}</code></div>
            </div>
            <button class="btn okc" style="padding:5px 10px;font-size:11px" onclick="tgQuickMsg('${chatId}','${name}')">
                <i data-lucide="send" style="width:11px;height:11px"></i> Message
            </button>
            <button class="btn err" style="padding:5px 8px;font-size:11px" onclick="tgRemoveUser('${name}')" title="Remove from directory">
                <i data-lucide="trash-2" style="width:11px;height:11px"></i>
            </button>
        </div>`).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function tgQuickMsg(chatId, name) {
    const msg = prompt(`Send a message to ${name} (${chatId}):`);
    if (!msg) return;
    const t = st.cfg.tg;
    if (!t) return lg('ERR', 'No Telegram token configured.');
    try {
        await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg })
        });
        lg('SYS', `Manual dispatch to ${name} (${chatId}): "${msg}"`);
    } catch (e) { lg('ERR', `TG Quick Msg failed: ${e.message}`); }
}

function tgRemoveUser(name) {
    if (!confirm(`Remove "${name}" from the known users directory?`)) return;
    delete st.cfg.tgUsers[name];
    svGlb();
    renderTgUsers();
}
