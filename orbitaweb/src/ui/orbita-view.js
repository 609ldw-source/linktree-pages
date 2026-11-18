import {
  DRUM_COLORS,
  PITCH_COLORS,
  TRACK_RADII,
} from '../constants.js';
import { attachGestures } from './gestures.js';

const ROOT_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const PACK_LABELS = {
  drums: 'DRUMS',
  piano: 'PIANO',
  pluck: 'PLUCK SYNTH',
  guitar: 'GUITAR',
};
const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function chipPosition(chip) {
  const radius = TRACK_RADII[chip.trackIndex];
  const radians = chip.angle * Math.PI * 2;
  return {
    x: 200 + Math.sin(radians) * radius,
    y: 200 - Math.cos(radians) * radius,
  };
}

function renderGuides(snapMode) {
  if (snapMode !== 'snap') return '';
  return Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    const x1 = 200 + Math.sin(angle) * 60;
    const y1 = 200 - Math.cos(angle) * 60;
    const x2 = 200 + Math.sin(angle) * 188;
    const y2 = 200 - Math.cos(angle) * 188;
    return `<line class="guide-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
  }).join('');
}

function renderChips(state, selectedChipId) {
  const colors = state.sourcePack === 'drums' ? DRUM_COLORS : PITCH_COLORS;
  return state.chips.map((chip) => {
    const { x, y } = chipPosition(chip);
    const color = colors[chip.colorIndex];
    const step = Math.round(chip.angle * 16) % 16;
    return `
      <g class="chip ${chip.id === selectedChipId ? 'selected' : ''}" data-chip-id="${escapeHtml(chip.id)}" tabindex="0" role="button"
        aria-label="${escapeHtml(color.name)}, 트랙 ${chip.trackIndex + 1}, 스텝 ${step + 1}" transform="translate(${x} ${y})">
        <circle class="chip-disc" r="11" fill="${color.hex}"></circle>
        <circle r="3.5" fill="rgba(255,255,255,.28)"></circle>
      </g>`;
  }).join('');
}

function renderSvg(state, selectedChipId) {
  const unique = escapeHtml(state.id);
  return `
    <svg class="orbita-svg" viewBox="0 0 400 400" role="img" aria-label="5트랙 Orbita 원판">
      <defs>
        <radialGradient id="platter-gradient-${unique}" cx="42%" cy="35%">
          <stop offset="0" stop-color="#252a35"></stop>
          <stop offset=".55" stop-color="#141821"></stop>
          <stop offset="1" stop-color="#0b0e14"></stop>
        </radialGradient>
      </defs>
      <circle class="platter-base" cx="200" cy="200" r="194"></circle>
      <g class="platter-motion">
        <circle class="platter-inner" cx="200" cy="200" r="188" fill="url(#platter-gradient-${unique})"></circle>
        ${renderGuides(state.snapMode)}
        ${TRACK_RADII.map((radius) => `<circle class="track-ring" cx="200" cy="200" r="${radius}"></circle>`).join('')}
        <circle class="hub-ring" cx="200" cy="200" r="35"></circle>
        <circle class="hub-dot" cx="200" cy="200" r="4"></circle>
        <g class="chips-layer">${renderChips(state, selectedChipId)}</g>
      </g>
      <g class="scanner" aria-hidden="true">
        <line class="scanner-line" x1="200" y1="17" x2="200" y2="192"></line>
        <rect class="scanner-head" x="194" y="8" width="12" height="22" rx="6"></rect>
        ${TRACK_RADII.map((radius, index) => `<circle class="scanner-sensor" data-track="${index}" cx="200" cy="${200 - radius}" r="5"></circle>`).join('')}
      </g>
    </svg>`;
}

function renderPalette(state) {
  const colors = state.sourcePack === 'drums' ? DRUM_COLORS : PITCH_COLORS;
  return colors.map((color, index) => `
    <button class="palette-chip" type="button" data-palette-color="${index}" style="--chip-color:${color.hex}" draggable="false">
      <span>${escapeHtml(color.name)}</span>
    </button>`).join('');
}

function renderPaletteSection(state) {
  return `
    <section class="palette-section" aria-label="칩 팔레트와 삭제 영역">
      <div class="palette-label"><span>CHIP PALETTE</span><span>CLICK TO PREVIEW · DRAG TO PLACE</span></div>
      <div class="palette-toolbar">
        <div class="chip-palette" role="list" aria-label="사용 가능한 색상 칩">${renderPalette(state)}</div>
        <div class="chip-trash-zone" role="region" aria-label="배치된 칩을 끌어 놓아 삭제">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 8v10m4-10v10m4-10v10M5 5h14M9 5l1-2h4l1 2m3 0-1 16H7L6 5"></path>
          </svg>
          <span>DROP</span>
        </div>
      </div>
    </section>`;
}

function renderControls(state) {
  const pitched = state.sourcePack !== 'drums';
  return `
    <div class="transport-row">
      <button class="play-orbita" type="button" data-action="toggle-play" aria-label="이 Orbita 재생" aria-pressed="false">▶</button>
      <div class="tempo-control">
        <label for="bpm-${escapeHtml(state.id)}">TEMPO</label>
        <input id="bpm-${escapeHtml(state.id)}" data-control="bpm-range" type="range" min="40" max="200" step="1" value="${state.bpm}">
      </div>
      <input data-control="bpm-number" type="number" min="40" max="200" step="1" value="${state.bpm}" aria-label="BPM 숫자 입력">
    </div>
    <div class="control-grid">
      <label class="control-field">
        <span>CHIP PACK</span>
        <select data-control="source-pack">
          ${Object.entries(PACK_LABELS).map(([value, label]) => `<option value="${value}" ${state.sourcePack === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      <div class="control-field">
        <span>PLACEMENT</span>
        <div class="segmented" data-segment="snap-mode">
          <button type="button" data-value="snap" aria-pressed="${state.snapMode === 'snap'}">16 STEP</button>
          <button type="button" data-value="free" aria-pressed="${state.snapMode === 'free'}">FREE</button>
        </div>
      </div>
      <label class="control-field pitch-control" ${pitched ? '' : 'hidden'}>
        <span>KEY</span>
        <select data-control="root-note">
          ${ROOT_NAMES.map((name, value) => `<option value="${value}" ${state.rootNote === value ? 'selected' : ''}>${name}</option>`).join('')}
        </select>
      </label>
      <div class="control-field pitch-control" ${pitched ? '' : 'hidden'}>
        <span>SCALE</span>
        <div class="segmented" data-segment="scale-mode">
          <button type="button" data-value="major" aria-pressed="${state.scaleMode === 'major'}">MAJOR</button>
          <button type="button" data-value="minor" aria-pressed="${state.scaleMode === 'minor'}">MINOR</button>
        </div>
      </div>
    </div>`;
}

export function renderOrbita(container, state, index, uiState, handlers) {
  const article = document.createElement('article');
  article.className = `orbita-card ${uiState.focused ? 'focused' : ''}`;
  article.dataset.orbitaId = state.id;
  article.dataset.pack = state.sourcePack;
  article.innerHTML = `
    <header class="card-head">
      <div class="orbita-index"><span class="index-dot"></span><strong>ORBITA ${String(index + 1).padStart(2, '0')}</strong><small>${PACK_LABELS[state.sourcePack]}</small></div>
      <button class="remove-orbita" type="button" data-action="remove" aria-label="Orbita ${index + 1} 제거">×</button>
    </header>
    <div class="platter-wrap">${renderSvg(state, uiState.selectedChipId)}</div>
    ${renderPaletteSection(state)}
    <div class="orbita-controls">${renderControls(state)}</div>`;

  container.append(article);

  article.querySelector('[data-action="toggle-play"]').addEventListener('click', () => handlers.onTogglePlay(state.id));
  article.querySelector('[data-action="remove"]').addEventListener('click', () => handlers.onRemove(state.id));
  article.querySelectorAll('[data-control="bpm-range"], [data-control="bpm-number"]').forEach((input) => {
    input.addEventListener('input', (event) => handlers.onBpm(state.id, event.target.value));
  });
  article.querySelector('[data-control="source-pack"]').addEventListener('change', (event) => handlers.onPack(state.id, event.target.value));
  article.querySelector('[data-control="root-note"]').addEventListener('change', (event) => handlers.onRoot(state.id, Number(event.target.value)));
  article.querySelectorAll('[data-segment="snap-mode"] button').forEach((button) => {
    button.addEventListener('click', () => handlers.onSnapMode(state.id, button.dataset.value));
  });
  article.querySelectorAll('[data-segment="scale-mode"] button').forEach((button) => {
    button.addEventListener('click', () => handlers.onScaleMode(state.id, button.dataset.value));
  });

  const view = {
    root: article,
    platterWrap: article.querySelector('.platter-wrap'),
    svg: article.querySelector('.orbita-svg'),
    platterMotion: article.querySelector('.platter-motion'),
    phase: 0,
    setPhase(phase) {
      this.phase = phase;
      const visualPhase = prefersReducedMotion ? Math.floor(phase * 16) / 16 : phase;
      article.querySelector('.platter-motion').style.transform = `rotate(${-visualPhase * 360}deg)`;
    },
    setRunning(running) {
      const button = article.querySelector('[data-action="toggle-play"]');
      button.textContent = running ? 'Ⅱ' : '▶';
      button.setAttribute('aria-pressed', String(running));
      button.setAttribute('aria-label', running ? '이 Orbita 정지' : '이 Orbita 재생');
      article.classList.toggle('is-playing', running);
    },
    flashTrack(trackIndex) {
      const sensor = article.querySelector(`.scanner-sensor[data-track="${trackIndex}"]`);
      if (!sensor) return;
      sensor.classList.add('active');
      window.setTimeout(() => sensor.classList.remove('active'), 90);
    },
  };
  attachGestures(view, state, {
    onAddChip: (colorIndex, placement) => handlers.onAddChip(state.id, colorIndex, placement),
    onMoveChip: (chipId, placement) => handlers.onMoveChip(state.id, chipId, placement),
    onDeleteChip: (chipId) => handlers.onDeleteChip(state.id, chipId),
    onSelectChip: (chipId) => handlers.onSelectChip(state.id, chipId),
    onPreviewChip: (colorIndex, trackIndex) => handlers.onPreviewChip(state.id, colorIndex, trackIndex),
    onSwipe: handlers.onSwipe,
  });
  return view;
}

export function renderAddCard(container, disabled, onAdd) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'add-orbita-card';
  button.disabled = disabled;
  button.setAttribute('aria-label', disabled ? 'Orbita는 최대 3개입니다' : '새 Orbita 추가');
  button.innerHTML = `<span><b aria-hidden="true">+</b>${disabled ? 'MAX 3 ORBITAS' : 'ADD ORBITA'}</span>`;
  button.addEventListener('click', onAdd);
  container.append(button);
  return button;
}
