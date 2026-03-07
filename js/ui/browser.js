let _browserLastUrl = '';

function _browserLog(msg, type = 'log') {
    const out = document.getElementById('browser-console-out');
    if (!out) return;
    const el = document.createElement('div');
    el.style.cssText = `padding:3px 6px;border-radius:4px;word-break:break-all;background:${type === 'error' ? 'rgba(255,74,74,0.1)' : type === 'info' ? 'rgba(0,179,255,0.08)' : 'rgba(255,255,255,0.03)'};color:${type === 'error' ? 'var(--err)' : type === 'info' ? 'var(--ac2)' : 'var(--txt)'};font-size:12px;font-family:var(--font-mono);border-left:2px solid ${type === 'error' ? 'var(--err)' : type === 'info' ? 'var(--ac2)' : 'rgba(255,255,255,0.15)'};`;
    el.textContent = msg;
    out.appendChild(el);
    out.scrollTop = out.scrollHeight;
}

function _browserHidePlaceholder() {
    const ph = document.getElementById('browser-frame-placeholder');
    if (ph) ph.style.display = 'none';
}

function browserGo() {
    const input = document.getElementById('browser-url');
    let val = (input ? input.value.trim() : '') || _browserLastUrl;
    if (!val) return;

    const frame = document.getElementById('browser-frame');
    if (!frame) return;

    if (val.startsWith('<') || val.startsWith('<!')) {
        const blob = new Blob([val], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        frame.src = blobUrl;
        _browserHidePlaceholder();
        _browserLog(`[info] Loaded inline HTML (${val.length} chars)`, 'info');
    } else {
        if (!/^https?:\/\//i.test(val)) val = 'https://' + val;
        _browserLastUrl = val;
        frame.src = val;
        _browserHidePlaceholder();
        _browserLog(`[info] Navigating to: ${val}`, 'info');
        if (input) input.value = val;
    }
}

function browserClear() {
    const frame = document.getElementById('browser-frame');
    if (frame) { frame.src = 'about:blank'; }
    const out = document.getElementById('browser-console-out');
    if (out) out.innerHTML = '';
    const ph = document.getElementById('browser-frame-placeholder');
    if (ph) ph.style.display = 'flex';
    _browserLastUrl = '';
    const input = document.getElementById('browser-url');
    if (input) input.value = '';
    _browserLog('[info] Browser cleared.', 'info');
}

function browserRunJs() {
    const inp = document.getElementById('browser-js-in');
    const code = inp ? inp.value.trim() : '';
    if (!code) return;
    const frame = document.getElementById('browser-frame');
    if (!frame || !frame.contentWindow) { _browserLog('[error] No page loaded in iframe.', 'error'); return; }
    try {
        const result = frame.contentWindow.eval(code);
        const out = result !== undefined ? JSON.stringify(result) : '(undefined)';
        _browserLog(`> ${code}`, 'log');
        _browserLog(`← ${out}`, 'info');
        if (typeof lg === 'function') lg('SYS', `Browser JS exec: ${code} => ${out}`);
    } catch (e) {
        _browserLog(`> ${code}`, 'log');
        _browserLog(`[error] ${e.message}`, 'error');
        if (typeof lg === 'function') lg('ERR', `Browser JS exec error: ${e.message}`);
    }
}

function browserScrape() {
    const frame = document.getElementById('browser-frame');
    if (!frame || !frame.contentWindow) { _browserLog('[error] No page loaded.', 'error'); return; }
    try {
        const doc = frame.contentDocument || frame.contentWindow.document;
        const title = doc.title || '(no title)';
        const text = (doc.body ? doc.body.innerText : '').substring(0, 5000);
        const url = frame.src || _browserLastUrl;
        const scraped = `[SCRAPED: ${url}]\nTitle: ${title}\n\n${text}`;
        const path = '/workspace/scrape_result.txt';
        if (typeof st !== 'undefined') {
            st.vfs[path] = scraped;
            if (typeof svGlb === 'function') svGlb();
            if (typeof rVfs === 'function') rVfs();
            if (typeof showToast === 'function') showToast('Page Scraped', path);
        }
        _browserLog(`[info] Scraped page → ${path} (${text.length} chars)`, 'info');
        if (typeof lg === 'function') lg('SYS', `Browser: Scraped "${title}" → ${path}`);
        if (typeof memAppend === 'function') memAppend('SYS', `[BROWSER SCRAPE]\n${scraped.substring(0, 1000)}`);
    } catch (e) {
        _browserLog(`[error] Cannot scrape: ${e.message}`, 'error');
        if (typeof lg === 'function') lg('ERR', `Browser scrape error: ${e.message}`);
    }
}

async function browserScreenshot(outPath, tgChatId) {
    const frame = document.getElementById('browser-frame');
    if (!frame) { _browserLog('[error] iframe not found', 'error'); return; }
    if (typeof html2canvas === 'undefined') { _browserLog('[error] html2canvas not loaded', 'error'); return; }

    _browserLog('[info] Capturing screenshot…', 'info');
    if (typeof lg === 'function') lg('SYS', 'Browser: Taking screenshot of iframe…');

    try {
        const doc = frame.contentDocument || frame.contentWindow.document;
        const canvas = await html2canvas(doc.body, { useCORS: true, logging: false, scale: 2 });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const savePath = outPath || '/workspace/browser_screenshot.jpg';

        if (typeof st !== 'undefined') {
            st.vfs[savePath] = dataUrl;
            if (typeof svGlb === 'function') svGlb();
            if (typeof rVfs === 'function') rVfs();
            if (typeof showToast === 'function') showToast('Screenshot Saved', savePath);
        }
        _browserLog(`[info] Screenshot saved → ${savePath}`, 'info');
        if (typeof lg === 'function') lg('SYS', `Browser: Screenshot saved to ${savePath}`);

        if (tgChatId && typeof tgSendDoc === 'function') {
            await tgSendDoc(tgChatId, savePath);
            _browserLog(`[info] Screenshot dispatched to Telegram user ${tgChatId}`, 'info');
        }
    } catch (e) {
        _browserLog(`[error] Screenshot failed: ${e.message}`, 'error');
        if (typeof lg === 'function') lg('ERR', `Browser screenshot error: ${e.message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('browser-url');
    if (inp) {
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); browserGo(); }
        });
    }
    const jsIn = document.getElementById('browser-js-in');
    if (jsIn) {
        jsIn.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); browserRunJs(); }
        });
    }
});

function browserOpenUrl(url) {
    const input = document.getElementById('browser-url');
    if (input) input.value = url;
    const tab = document.querySelector('.nav-tab[data-target="p-browser"]');
    if (tab) tab.click();
    setTimeout(() => browserGo(), 150);
}
