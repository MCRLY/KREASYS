async function llm(p, u, mod, onChunk) {
    if (!st.mods.length) throw new Error("No models configured.");
    const m = mod || st.mods[0];

    if (m.p === 'webllm') {
        if (typeof wIsReady === 'function' && wIsReady()) {
            return await wLlm(p, u, st.cfg.tmp, true, onChunk);
        } else {
            throw new Error('WebLLM model is not loaded. Please load a local model first from the Local AI tab.');
        }
    }

    let url = m.p === 'custom' ? m.e : PRV[m.p];
    if (!url) throw new Error(`Unknown provider "${m.p}". Please select a provider or use Custom.`);
    if (!m.k && m.p !== 'ollama') throw new Error(`No API key set for "${m.n}". Please add your key in the Models tab.`);

    const isAnthropic = m.p === 'anthropic';
    const isLocalOllama = m.p === 'ollama';

    const headers = { 'Content-Type': 'application/json' };
    if (isAnthropic) {
        headers['x-api-key'] = m.k.trim();
        headers['anthropic-version'] = '2023-06-01';
    } else {
        if (m.k) headers['Authorization'] = `Bearer ${m.k.trim()}`;
        if (m.p === 'openrouter') { headers['HTTP-Referer'] = window.location.origin; headers['X-Title'] = 'KREASYS'; }
    }

    let b;
    if (isAnthropic) {
        b = { model: m.m, max_tokens: 2048, system: p, messages: [{ role: 'user', content: u }], stream: !!onChunk };
    } else {
        b = { model: m.m, messages: [{ role: 'system', content: p }, { role: 'user', content: u }], temperature: parseFloat(st.cfg.tmp), stream: !!onChunk };
        if (m.p === 'openrouter' && onChunk) b.stream_options = { include_usage: true };
    }

    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(b) });
    if (!r.ok) throw new Error(`API error ${r.status} from ${m.p}: ${await r.text()}`);

    if (!onChunk) {
        const d = await r.json();
        if (isAnthropic) return d.content?.[0]?.text || '';
        if (m.p === 'openrouter') st.tk += (d.usage?.total_tokens || 0);
        return d.choices?.[0]?.message?.content || d.message?.content || '';
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.substring(6);
                if (dataStr === '[DONE]') continue;
                try {
                    const data = JSON.parse(dataStr);
                    let chunkText = '';

                    if (isAnthropic) {
                        if (data.type === 'content_block_delta' && data.delta?.text) {
                            chunkText = data.delta.text;
                        }
                    } else {
                        chunkText = data.choices?.[0]?.delta?.content || '';
                        if (m.p === 'openrouter' && data.usage) st.tk += (data.usage.total_tokens || 0);
                    }

                    if (chunkText) {
                        fullText += chunkText;
                        onChunk(chunkText, fullText);
                    }
                } catch (e) {
                    console.warn('Streaming parse error on chunk:', dataStr);
                }
            } else if (isLocalOllama) {
                try {
                    const data = JSON.parse(trimmed);
                    const chunkText = data.message?.content || '';
                    if (chunkText) {
                        fullText += chunkText;
                        onChunk(chunkText, fullText);
                    }
                } catch (e) { }
            }
        }
    }
    return fullText;
}

async function route(q, attachment) {
    if (typeof wIsReady === 'function' && wIsReady()) {
        const localMod = st.mods.find(m => m.p === 'webllm');
        if (localMod) { lg('SYS', `Router: Using local WebLLM [${localMod.n}]`); return localMod; }
    }
    if (st.mods.length === 1) return st.mods[0];

    let reqType = 'text';
    const lq = q.toLowerCase();
    if (lq.includes('generate image') || lq.includes('draw') || lq.includes('create an image')) reqType = 'image';
    else if (lq.includes('generate audio') || lq.includes('speak') || lq.includes('text to speech')) reqType = 'audio';
    else if (lq.includes('generate video') || lq.includes('animate')) reqType = 'video';
    else if (lq.includes('look at') || lq.includes('describe this') || lq.includes('vision') || attachment) reqType = 'multimodal';

    const avail = st.mods.filter(m => (m.t === reqType || m.t === 'multimodal') && m.p !== 'webllm');
    if (avail.length === 0) return st.mods.filter(m => m.p !== 'webllm')[0] || st.mods[0];
    if (avail.length === 1) return avail[0];

    const p = `You are a Router. Available Models:\n${avail.map(m => `- ${m.id} (${m.m})`).join('\n')}\nAnalyze user query and return ONLY the ID of the best model. Default: ${avail[0].id}.`;
    try { const r = await llm(p, q, avail[0]); return avail.find(m => r.includes(m.id)) || avail[0]; }
    catch { return avail[0] }
}

async function xc(q, isC, attachment) {
    if (!q.trim() && !attachment) return;
    st.run = 1; st.ts++;
    const xn = isC ? '#c-in' : '#t-in';
    $(xn).value = ''; $(xn).style.height = '50px';
    $('#btn-run-c').style.display = 'none'; $('#btn-stop-c').style.display = '';
    lg('USR', q);
    if (isC) chLg('USR', q, attachment);

    if (typeof memResetIdle === 'function') memResetIdle();

    const m = await route(q, attachment);
    lg('SYS', `Router selected [${m.n}]`);

    const knownUsers = (st.cfg.tgUsers && Object.keys(st.cfg.tgUsers).length > 0)
        ? Object.entries(st.cfg.tgUsers).map(([name, id]) => `- ${name}: ${id}`).join('\n')
        : 'None yet.';

    const memCtx = (typeof memContext === 'function') ? memContext() : (st.vfs['/system/memory.log'] || '');

    const p = `${st.vfs['/system/personality.md']}\n\nSKILLS:\n${st.vfs['/system/skills.md']}\n\nKNOWN TELEGRAM USERS (use these IDs with <tg_send>):\n${knownUsers}\n\n${memCtx}\n\nVFS STATE:\n${buildVfsContext()}`;

    let userMsg = q;
    if (attachment) {
        userMsg = `[USER ATTACHED FILE: "${attachment.name}" (${attachment.type}, ${(attachment.size / 1024).toFixed(1)}KB)]\n${attachment.isText ? 'File contents:\n' + attachment.content : '[Binary/Image file]'}\n\nUser message: ${q}`;
    }

    try {
        let cLogDom = null;

        const streamCallback = (chunk, accumulated) => {
            if (isC && cLogDom) {
                if (Math.random() > 0.3 || accumulated.endsWith('\n')) {
                    cLogDom.innerHTML = marked.parse(accumulated + ' █');
                    cLogDom.parentElement.scrollTop = cLogDom.parentElement.scrollHeight;
                }
            }
        };

        if (isC) {
            cLogDom = chLgStream('AGT', '...');
        }

        const r = await llm(p, userMsg, m, streamCallback);

        if (isC && cLogDom) {
            cLogDom.innerHTML = marked.parse(r
                .replace(/<file[^>]*>[\s\S]*?<\/file>/g, '*[VFS update — Check Workspace]*')
                .replace(/<plan[^>]*>[\s\S]*?<\/plan>/gi, '')
                .replace(/<tg_send[^>]*>[\s\S]*?<\/tg_send>/gi, '*[Autonomous Telegram Message Dispatched]*')
            );
        }

        if (typeof psPlan === 'function') psPlan(r);
        if (typeof memAppend === 'function' && m.p === 'webllm') memAppend('AGT', r);
        lg('AGT', r);

        const tgRg = /<tg_send\s+chat_id=["']?([^"'>]+)["']?>([\s\S]*?)<\/tg_send>/gi;
        let tm;
        while ((tm = tgRg.exec(r)) !== null) {
            const tgtId = tm[1], payload = tm[2].trim();
            lg('SYS', `Autonomous Dispatch -> TG ID: ${tgtId}`);
            if (st.cfg.tg) {
                fetch(`https://api.telegram.org/bot${st.cfg.tg}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: tgtId, text: payload })
                }).catch(e => lg('ERR', `TG Dispatch failed: ${e.message}`));
            }
        }

        psVfs(r);

    } catch (e) {
        lg('ERR', e.message);
        if (isC) chLg('AGT', `**Error:** ${e.message}`);
    }

    st.run = 0;
    $('#btn-run-c').style.display = ''; $('#btn-stop-c').style.display = 'none';
    if (typeof memResetIdle === 'function') memResetIdle();
}
