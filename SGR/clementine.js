/* Melody transcribed from the supplied upper voice and guitar TAB. */
(function () {
    'use strict';
    const pitches = {
        D3: [50, '레 (D)', 4, 0, -1], 'F#3': [54, '파♯ (F♯)', 4, 4, 1],
        G3: [55, '솔 (G)', 3, 0, 2], A3: [57, '라 (A)', 3, 2, 3],
        B3: [59, '시 (B)', 2, 0, 4], C4: [60, '도 (C)', 2, 1, 5], D4: [62, '레 (높은 D)', 2, 3, 6]
    };
    const raw = [
        [['G3', .75], ['G3', .25]],
        [['G3', 1], ['D3', 1], ['B3', .75], ['B3', .25]],
        [['B3', 1], ['G3', 1], ['G3', .75], ['B3', .25]],
        [['D4', 1], ['D4', 1], ['C4', .75], ['B3', .25]],
        [['A3', 2], ['A3', .75], ['B3', .25]],
        [['C4', 1], ['C4', 1], ['B3', .75], ['A3', .25]],
        [['B3', 1], ['G3', 1], ['G3', .75], ['B3', .25]],
        [['A3', 1], ['D3', 1], ['F#3', .75], ['A3', .25]],
        [['G3', 2], ['G3', .75], ['G3', .25]],
        [['G3', 1], ['D3', 1], ['B3', .75], ['B3', .25]],
        [['B3', 1], ['G3', 1], ['G3', .75], ['B3', .25]],
        [['D4', 1], ['D4', 1], ['C4', .75], ['B3', .25]],
        [['A3', 2], ['A3', .75], ['B3', .25]],
        [['C4', 1], ['C4', 1], ['B3', .75], ['A3', .25]],
        [['B3', 1], ['G3', 1], ['G3', .75], ['B3', .25]],
        [['A3', 1], ['D3', 1], ['F#3', .75], ['A3', .25]],
        [['G3', 2], [null, 1]]
    ];
    const sections = Array.from({ length: 4 }, (_, section) => {
        const first = section * 4 + 1, last = first + 3;
        let beat = 0, index = 0;
        const events = [];
        for (let measure = section === 0 ? 0 : first; measure <= last; measure++) {
            for (const [pitch, beats] of raw[measure]) {
                const p = pitches[pitch];
                events.push(p ? { pitch, beats, beat, measure, index: index++, name: p[1],
                    freq: 440 * 2 ** ((p[0] - 69) / 12), string: p[2], fret: p[3], step: p[4] } :
                    { rest: true, beats, beat, measure });
                beat += beats;
            }
        }
        return { first, last, events, notes: events.filter(n => !n.rest), beats: beat };
    });

    function measureSVG(events, number, target, done, demo) {
        const label = number === 0 ? '시작음' : `${number}마디`;
        const positions = events.map((n, i) => 103 + i * (232 / Math.max(events.length, 3)));
        let svg = `<svg viewBox="0 0 360 190" role="img" aria-label="${label} 멜로디 오선보와 TAB"><title>${label}: ${events.map(n => n.rest ? '쉼표' : `${n.name}, ${n.string}번줄 ${n.fret}프렛`).join(', ')}</title>`;
        svg += `<text x="10" y="18" class="bar-label">${label}</text>`;
        for (let i = 0; i < 5; i++) svg += `<path d="M12 ${40 + i * 10}H348" class="staff-line"/>`;
        for (let i = 0; i < 6; i++) svg += `<path d="M55 ${112 + i * 10}H348" class="tab-line"/>`;
        svg += '<text x="14" y="79" class="clef">𝄞</text><text x="51" y="49" class="key-sharp">♯</text><text x="73" y="55" class="time-signature">3</text><text x="73" y="76" class="time-signature">4</text><text x="16" y="137" class="tab-label">TAB</text>';
        events.forEach((n, i) => {
            const x = positions[i], y = n.rest ? 60 : 80 - n.step * 5;
            const state = !n.rest && n.index === target ? 'current' : !demo && !n.rest && n.index < done ? 'done' : '';
            svg += `<g class="score-note ${state}">`;
            if (state === 'current') svg += `<rect x="${x - 16}" y="29" width="34" height="142" rx="10" class="note-highlight"/>`;
            if (n.rest) svg += `<text x="${x - 6}" y="77" class="rest-symbol">𝄽</text>`;
            else {
                svg += `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="4.3" transform="rotate(-18 ${x} ${y})" class="note-head ${n.beats >= 2 ? 'half-note' : ''}"/><path d="M${x + 6} ${y}V30" class="note-stem"/>`;
                if (n.beats === .75) svg += `<circle cx="${x + 13}" cy="${y - (n.step % 2 === 0 ? 5 : 0)}" r="2" class="note-dot"/>`;
                if (n.beats === .75 && events[i + 1]?.beats === .25) {
                    const end = positions[i + 1] + 6;
                    svg += `<path d="M${x + 6} 30H${end}M${end - 13} 36H${end}" class="note-beam"/>`;
                }
                const tabY = 112 + (n.string - 1) * 10;
                svg += `<rect x="${x - 9}" y="${tabY - 8}" width="19" height="16" class="tab-mask"/><text x="${x}" y="${tabY + 5}" class="tab-number">${n.fret}</text>`;
            }
            svg += '</g>';
        });
        return svg + '<path d="M348 40V80M348 112V162" class="staff-line"/></svg>';
    }

    function guitarBuffer(context, frequency, duration) {
        const length = Math.ceil(Math.min(duration * .94, 2.4) * context.sampleRate);
        const buffer = context.createBuffer(1, length, context.sampleRate), samples = buffer.getChannelData(0);
        // A short pluck with independently decaying string harmonics. No samples or network needed.
        for (let i = 0; i < length; i++) {
            const t = i / context.sampleRate;
            let value = 0;
            for (let h = 1; h <= 9; h++) value += Math.sin(2 * Math.PI * frequency * h * t) * Math.exp(-t * (2.7 + h * .65)) / h ** 1.45;
            samples[i] = value * .27 * Math.min(1, t / .004) * Math.min(1, (length - i) / (context.sampleRate * .03));
        }
        return buffer;
    }

    function createLesson(hooks) {
        const el = id => document.getElementById(id);
        let sectionIndex = 0, noteIndex = 0, phase = 'idle', heard = false;
        let generation = 0, context = null, sources = [], frame = null, resumeTimer = null;
        let stableSince = null, quietSince = null, previousFreq = null, fresh = true, scrollMeasure = null;
        const completed = new Set();
        const section = () => sections[sectionIndex];
        function clearGate() { stableSince = quietSince = previousFreq = null; fresh = true; }
        function cancelAudio() {
            generation++;
            if (frame !== null) cancelAnimationFrame(frame);
            if (resumeTimer !== null) clearTimeout(resumeTimer);
            frame = resumeTimer = null;
            for (const source of sources) { try { source.stop(); source.disconnect(); } catch (_) {} }
            sources = [];
            const old = context; context = null;
            if (old && old.state !== 'closed') old.close().catch(() => {});
        }
        function render(target = noteIndex, demo = false) {
            const s = section();
            el('clem-range').innerText = `${s.first}–${s.last}마디${sectionIndex === 0 ? ' · 시작음 포함' : ''} · 3/4박자 · ♩ = 88`;
            el('clem-counter').innerText = phase === 'complete' ? '구간 완료!' : `음 ${Math.min(noteIndex + 1, s.notes.length)} / ${s.notes.length}`;
            el('clementine-score').innerHTML = [...new Set(s.events.map(n => n.measure))].map(m => {
                const notes = s.events.filter(n => n.measure === m);
                return `<div id="clem-measure-${m}" class="measure-card${m === 0 ? ' pickup-card' : ''}">${measureSVG(notes, m, target, noteIndex, demo)}</div>`;
            }).join('');
            for (let i = 0; i < 4; i++) {
                el(`clem-part-${i}`).className = `clem-part${i === sectionIndex ? ' selected' : ''}${completed.has(i) ? ' completed' : ''}`;
                el(`clem-part-${i}`).setAttribute('aria-pressed', String(i === sectionIndex));
                el(`clem-part-${i}`).innerText = `${completed.has(i) ? '✓ ' : ''}${i + 1}구간`;
            }
            el('clem-demo-btn').disabled = false;
            el('clem-demo-btn').innerText = phase === 'demo' ? '↻ 시범 다시 듣기' : '▶ 시범 듣기';
            el('clem-stop-btn').hidden = phase !== 'demo';
            el('clem-reset-btn').hidden = phase === 'demo' || !heard;
            el('clem-next-btn').hidden = phase !== 'complete';
            el('clem-next-btn').innerText = completed.size === 4 ? '처음부터 다시' : '다음 4마디 →';
            const current = s.notes[target];
            el('clem-target').innerText = phase === 'complete' ? '참 잘했어요! 🎉' : current ?
                `${current.name} · ${current.string}번줄 ${current.fret === 0 ? '개방현 (0프렛)' : `${current.fret}프렛`}` : '';
            if (current && current.measure !== scrollMeasure) {
                scrollMeasure = current.measure;
                const card = el(`clem-measure-${current.measure}`), container = el('practice-content');
                // Scroll only the score area; never move the fixed microphone controls.
                if (card.getBoundingClientRect && container.getBoundingClientRect) {
                    const r = card.getBoundingClientRect(), bounds = container.getBoundingClientRect();
                    if (r.top < bounds.top || r.bottom > bounds.bottom) container.scrollTop += r.top - bounds.top;
                }
            }
        }
        function decorateTarget() {
            el('progress-tag').innerText = `구간 ${sectionIndex + 1} / 4`;
            el('note-display').innerText = '클레멘타인';
            el('start-listen-btn').disabled = !canListen();
            el('start-listen-btn').style.display = phase === 'complete' ? 'none' : 'block';
            el('start-listen-btn').innerText = '🎧 따라 치기 시작';
            el('mic-reconnect-btn').disabled = !canListen();
            if (phase === 'complete') {
                hooks.feedback(completed.size === 4 ? '클레멘타인 끝까지 완성했어요! 🎉' : '네 마디를 모두 연주했어요! 🎉', 'status-success');
            } else hooks.feedback(phase === 'idle' ? '먼저 시범 듣기를 눌러 멜로디를 들어보세요 🎵' : phase === 'demo' ?
                '기타 멜로디를 듣고 있어요 🎵' : '박자 걱정 없이, 강조된 음을 차례로 연주해요 🎸', 'status-wait');
            render();
        }
        function selectSection(index) {
            if (!Number.isInteger(index) || index < 0 || index > 3) return;
            cancelAudio(); hooks.stopInput();
            sectionIndex = index; noteIndex = 0; phase = 'idle'; heard = false; scrollMeasure = null;
            clearGate(); hooks.selectNotes(section().notes); hooks.prepareTarget(0, false);
            el('clem-feedback').innerText = '';
        }
        function canListen() { return phase === 'ready' || phase === 'practice'; }
        function listeningStarted() { phase = 'practice'; stableSince = quietSince = null; render(); }
        function suspend() {
            cancelAudio();
            if (phase === 'demo') { phase = 'idle'; heard = false; }
            if (phase === 'practice') phase = 'ready';
            decorateTarget();
        }
        async function playDemo() {
            cancelAudio(); hooks.stopInput();
            const token = generation;
            noteIndex = 0; heard = false; phase = 'demo'; clearGate(); scrollMeasure = null;
            hooks.prepareTarget(0, false);
            el('clem-feedback').innerText = '시범이 끝나면 따라 치기 시작을 눌러주세요.';
            let ctx;
            try {
                const Audio = window.AudioContext || window.webkitAudioContext;
                if (!Audio) throw new Error('audio-unavailable');
                ctx = new Audio(); context = ctx;
                const resume = ctx.resume(); // Keep resume in the originating button gesture on WebKit.
                await Promise.race([resume, new Promise((_, reject) => {
                    resumeTimer = setTimeout(() => reject(new Error('audio-timeout')), 4000);
                })]);
                if (resumeTimer !== null && token === generation) clearTimeout(resumeTimer);
                if (token !== generation || document.hidden) return false;
                resumeTimer = null;
                if (ctx.state !== 'running') throw new Error('audio-suspended');
                const s = section(), seconds = 60 / 88;
                const cache = new Map();
                const buffers = s.notes.map(n => {
                    const key = `${n.pitch}:${n.beats}`;
                    if (!cache.has(key)) cache.set(key, guitarBuffer(ctx, n.freq, n.beats * seconds));
                    return cache.get(key);
                });
                const start = ctx.currentTime + .12;
                for (const [i, n] of s.notes.entries()) {
                    const source = ctx.createBufferSource();
                    source.buffer = buffers[i];
                    source.connect(ctx.destination); source.start(start + n.beat * seconds); sources.push(source);
                }
                ctx.addEventListener('statechange', () => {
                    if (token === generation && phase === 'demo' && ctx.state !== 'running') {
                        suspend(); el('clem-feedback').innerText = '소리가 잠시 멈췄어요. 시범 듣기를 다시 눌러주세요.';
                    }
                });
                let highlighted = -2;
                const update = () => {
                    if (token !== generation) return;
                    const elapsed = (ctx.currentTime - start) / seconds;
                    if (elapsed >= s.beats + .15) {
                        cancelAudio(); heard = true; phase = 'ready'; hooks.prepareTarget(0, false);
                        el('clem-feedback').innerText = '시범 끝! 준비되면 따라 치기 시작을 눌러주세요.';
                        return;
                    }
                    const event = s.events.find(n => elapsed >= n.beat && elapsed < n.beat + n.beats);
                    const next = event && !event.rest ? event.index : -1;
                    if (next !== highlighted) { highlighted = next; render(next, true); }
                    frame = requestAnimationFrame(update);
                };
                update(); return true;
            } catch (_) {
                if (token !== generation) return false;
                cancelAudio(); phase = 'idle'; decorateTarget();
                el('clem-feedback').innerText = '시범 소리를 시작하지 못했어요. 시범 듣기를 다시 눌러주세요.';
                return false;
            }
        }
        function acceptPitch(pitch, rms, now) {
            if (phase !== 'practice' || !hooks.isListening()) return;
            const note = section().notes[noteIndex];
            const quiet = pitch < 0 || rms < .003 / hooks.sensitivity();
            if (quiet) {
                stableSince = null;
                if (quietSince === null) quietSince = now;
                if (now - quietSince >= 80) fresh = true;
                return;
            }
            quietSince = null;
            const matches = Number.isFinite(pitch) && Math.abs(pitch - note.freq) < 4;
            // A changed pitch is a new melody note. Equal consecutive notes require a fresh quiet gap.
            if (!fresh && previousFreq !== null && Math.abs(note.freq - previousFreq) > 4 && matches) fresh = true;
            if (!fresh || !matches) { stableSince = null; return; }
            if (stableSince === null) stableSince = now;
            if (now - stableSince < 90) return;
            previousFreq = note.freq; fresh = false; stableSince = null; noteIndex++;
            if (noteIndex === section().notes.length) {
                phase = 'complete'; completed.add(sectionIndex); hooks.stopInput(); render(-1);
                el('start-listen-btn').style.display = 'none'; el('mic-reconnect-btn').disabled = true;
                hooks.feedback(completed.size === 4 ? '클레멘타인 끝까지 완성했어요! 🎉' : '네 마디를 모두 연주했어요! 🎉', 'status-success');
                el('clem-feedback').innerText = completed.size === 4 ? '다른 구간을 골라 다시 연습할 수도 있어요.' : '다시 연습하거나 다음 4마디로 넘어가세요.';
            } else {
                hooks.prepareTarget(noteIndex, true);
                el('clem-feedback').innerText = section().notes[noteIndex].freq === previousFreq ?
                    '✓ 좋아요! 같은 음은 울림을 잠깐 멈추고 다시 튕겨주세요.' : '✓ 좋아요! 다음 음을 연주해주세요.';
            }
        }
        function repeat() {
            cancelAudio(); hooks.stopInput(); noteIndex = 0; clearGate(); phase = heard ? 'ready' : 'idle';
            hooks.prepareTarget(0, false); el('clem-feedback').innerText = '';
        }
        for (let i = 0; i < 4; i++) el(`clem-part-${i}`).addEventListener('click', () => selectSection(i));
        el('clem-demo-btn').addEventListener('click', playDemo);
        el('clem-stop-btn').addEventListener('click', () => { suspend(); el('clem-feedback').innerText = '다시 들으려면 시범 듣기를 눌러주세요.'; });
        el('clem-reset-btn').addEventListener('click', repeat);
        el('clem-next-btn').addEventListener('click', () => {
            if (completed.size === 4) { completed.clear(); selectSection(0); return; }
            for (let step = 1; step <= 4; step++) {
                const next = (sectionIndex + step) % 4;
                if (!completed.has(next)) { selectSection(next); return; }
            }
        });
        return { enter: () => selectSection(0), selectSection, playDemo, repeat, canListen, listeningStarted,
            decorateTarget, acceptPitch, stop: cancelAudio, suspend,
            get phase() { return phase; }, get sectionIndex() { return sectionIndex; } };
    }
    window.Clementine = { sections, createLesson };
})();
