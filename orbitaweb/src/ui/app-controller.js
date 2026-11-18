import { MAX_ORBITAS } from '../constants.js';
import { AudioEngine } from '../audio/audio-engine.js';
import { clampBpm } from '../core/music.js';
import { createId, createOrbita } from '../core/project.js';
import { OrbitaTransport } from '../core/transport.js';
import { renderAddCard, renderOrbita } from './orbita-view.js';

export class AppController {
  constructor({ project, store, elements, audioEngine = null }) {
    this.project = project;
    this.store = store;
    this.elements = elements;
    this.audioEngine = audioEngine ?? new AudioEngine({ initialVolume: project.masterVolume });
    this.transports = new Map();
    this.views = new Map();
    this.selectedChipIds = new Map();
    this.focusedIndex = 0;
    this.viewMode = 'focus';
    this.toastTimer = null;
    this.schedulerTimer = null;
    this.animationFrame = null;

    this.handlers = {
      onTogglePlay: (id) => this.togglePlay(id),
      onRemove: (id) => this.removeOrbita(id),
      onBpm: (id, bpm) => this.changeBpm(id, bpm),
      onPack: (id, pack) => this.changePack(id, pack),
      onRoot: (id, root) => this.updateOrbita(id, (orbita) => ({ ...orbita, rootNote: root })),
      onScaleMode: (id, mode) => this.updateOrbita(id, (orbita) => ({ ...orbita, scaleMode: mode })),
      onSnapMode: (id, mode) => this.updateOrbita(id, (orbita) => ({ ...orbita, snapMode: mode })),
      onAddChip: (id, colorIndex, placement) => this.addChip(id, colorIndex, placement),
      onMoveChip: (id, chipId, placement) => this.moveChip(id, chipId, placement),
      onDeleteChip: (id, chipId) => this.deleteChip(id, chipId),
      onSelectChip: (id, chipId) => this.selectChip(id, chipId),
      onPreviewChip: (id, colorIndex, trackIndex) => this.previewChip(id, colorIndex, trackIndex),
      onSwipe: (direction) => this.swipe(direction),
    };

    this.bindGlobalControls();
    this.render();
    this.startLoops();
  }

  bindGlobalControls() {
    this.elements.playAll.addEventListener('click', () => this.startAll());
    this.elements.stopAll.addEventListener('click', () => this.stopAll());
    this.elements.masterVolume.value = String(this.project.masterVolume);
    this.elements.masterVolume.addEventListener('input', (event) => {
      this.project = { ...this.project, masterVolume: Number(event.target.value) };
      this.audioEngine.setMasterVolume(this.project.masterVolume);
      this.requestSave();
    });
    this.elements.exportButton.addEventListener('click', () => this.store.exportJson(this.project));
    this.elements.importButton.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener('change', (event) => this.importFile(event));
    this.elements.viewButtons.forEach((button) => {
      button.addEventListener('click', () => this.setViewMode(button.dataset.view));
    });
  }

  setViewMode(mode) {
    this.viewMode = mode === 'overview' ? 'overview' : 'focus';
    this.elements.viewButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.view === this.viewMode));
    });
    this.render();
  }

  render() {
    const { stage } = this.elements;
    stage.classList.toggle('focus-view', this.viewMode === 'focus');
    stage.classList.toggle('overview-view', this.viewMode === 'overview');
    stage.dataset.count = String(this.project.orbitas.length);
    stage.innerHTML = '';
    this.views.clear();
    this.focusedIndex = Math.max(0, Math.min(this.focusedIndex, this.project.orbitas.length - 1));

    this.project.orbitas.forEach((orbita, index) => {
      const view = renderOrbita(stage, orbita, index, {
        focused: index === this.focusedIndex,
        selectedChipId: this.selectedChipIds.get(orbita.id) ?? null,
      }, this.handlers);
      const transport = this.transports.get(orbita.id);
      view.setRunning(Boolean(transport?.running));
      if (transport?.running && this.audioEngine.context) {
        view.setPhase(transport.phaseAt(this.audioEngine.context.currentTime));
      }
      if (this.viewMode === 'overview') {
        view.root.addEventListener('click', (event) => {
          if (event.target.closest('button, input, select, [data-chip-id]')) return;
          this.focusedIndex = index;
          this.setViewMode('focus');
        });
      }
      this.views.set(orbita.id, view);
    });

    renderAddCard(stage, this.project.orbitas.length >= MAX_ORBITAS, () => this.addOrbita());
  }

  updateOrbita(id, updater, { render = true } = {}) {
    let updatedOrbita = null;
    this.project = {
      ...this.project,
      orbitas: this.project.orbitas.map((orbita) => {
        if (orbita.id !== id) return orbita;
        updatedOrbita = updater(orbita);
        return updatedOrbita;
      }),
    };
    if (!updatedOrbita) return;
    this.transports.get(id)?.updateOrbita(updatedOrbita);
    this.requestSave();
    if (render) this.render();
  }

  addOrbita() {
    if (this.project.orbitas.length >= MAX_ORBITAS) {
      this.showToast('Orbita는 최대 3개까지 만들 수 있습니다.');
      return;
    }
    this.project = { ...this.project, orbitas: [...this.project.orbitas, createOrbita()] };
    this.focusedIndex = this.project.orbitas.length - 1;
    this.requestSave();
    this.render();
    this.announce(`Orbita ${this.project.orbitas.length}을 추가했습니다.`);
  }

  removeOrbita(id) {
    const orbita = this.project.orbitas.find((item) => item.id === id);
    if (!orbita) return;
    if (this.project.orbitas.length === 1) {
      this.showToast('최소 한 개의 Orbita가 필요합니다.');
      return;
    }
    if (orbita.chips.length && !window.confirm('이 Orbita와 배치된 칩을 삭제할까요?')) return;
    this.audioEngine.silenceOrbita(id);
    this.transports.get(id)?.stop();
    this.transports.delete(id);
    this.views.delete(id);
    this.selectedChipIds.delete(id);
    this.project = { ...this.project, orbitas: this.project.orbitas.filter((item) => item.id !== id) };
    this.focusedIndex = Math.min(this.focusedIndex, this.project.orbitas.length - 1);
    this.requestSave();
    this.render();
    this.announce('Orbita를 제거했습니다.');
  }

  changeBpm(id, value) {
    const bpm = clampBpm(value);
    this.updateOrbita(id, (orbita) => ({ ...orbita, bpm }), { render: false });
    const view = this.views.get(id);
    if (view) {
      view.root.querySelectorAll('[data-control="bpm-range"], [data-control="bpm-number"]').forEach((input) => { input.value = String(bpm); });
    }
    const transport = this.transports.get(id);
    if (transport?.running && this.audioEngine.context) transport.setBpm(bpm, this.audioEngine.context.currentTime);
  }

  changePack(id, sourcePack) {
    const orbita = this.project.orbitas.find((item) => item.id === id);
    if (!orbita || orbita.sourcePack === sourcePack) return;
    const maxColor = sourcePack === 'drums' ? 3 : 6;
    const incompatible = orbita.chips.some((chip) => chip.colorIndex > maxColor);
    if (incompatible && !window.confirm('새 칩팩에서 사용할 수 없는 색상 칩을 제거할까요?')) {
      this.render();
      return;
    }
    this.updateOrbita(id, (current) => ({
      ...current,
      sourcePack,
      chips: current.chips.filter((chip) => chip.colorIndex <= maxColor),
    }));
  }

  addChip(id, colorIndex, placement) {
    const chip = { id: createId('chip'), colorIndex, ...placement };
    this.selectedChipIds.set(id, chip.id);
    this.updateOrbita(id, (orbita) => ({ ...orbita, chips: [...orbita.chips, chip] }));
    this.previewChip(id, colorIndex, placement.trackIndex);
  }

  async previewChip(id, colorIndex, trackIndex) {
    const orbita = this.project.orbitas.find((item) => item.id === id);
    if (!orbita) return;
    try {
      await this.audioEngine.preview(orbita, colorIndex, trackIndex);
      this.views.get(id)?.flashTrack(trackIndex);
    } catch (error) {
      this.showToast('오디오를 시작하지 못했습니다. 화면을 터치한 뒤 다시 시도해주세요.');
    }
  }

  moveChip(id, chipId, placement) {
    this.selectedChipIds.set(id, chipId);
    this.updateOrbita(id, (orbita) => ({
      ...orbita,
      chips: orbita.chips.map((chip) => chip.id === chipId ? { ...chip, ...placement } : chip),
    }));
  }

  deleteChip(id, chipId) {
    this.selectedChipIds.delete(id);
    this.updateOrbita(id, (orbita) => ({ ...orbita, chips: orbita.chips.filter((chip) => chip.id !== chipId) }));
    this.announce('칩을 삭제했습니다.');
  }

  selectChip(id, chipId) {
    if (chipId) this.selectedChipIds.set(id, chipId);
    else this.selectedChipIds.delete(id);
    this.render();
  }

  swipe(direction) {
    if (this.viewMode !== 'focus') return;
    const count = this.project.orbitas.length;
    this.focusedIndex = Math.max(0, Math.min(count - 1, this.focusedIndex + direction));
    this.render();
  }

  async togglePlay(id) {
    const transport = this.transports.get(id);
    if (transport?.running) {
      this.stopOrbita(id);
      return;
    }
    try {
      const context = await this.audioEngine.ensureStarted();
      const orbita = this.project.orbitas.find((item) => item.id === id);
      if (!orbita) return;
      const nextTransport = new OrbitaTransport(orbita);
      nextTransport.start(context.currentTime + 0.05);
      this.transports.set(id, nextTransport);
      this.views.get(id)?.setRunning(true);
    } catch (error) {
      this.showToast('오디오를 시작하지 못했습니다. 화면을 터치한 뒤 다시 시도해주세요.');
    }
  }

  stopOrbita(id) {
    this.audioEngine.silenceOrbita(id);
    this.transports.get(id)?.stop();
    const view = this.views.get(id);
    view?.setRunning(false);
    view?.setPhase(0);
  }

  async startAll() {
    try {
      const context = await this.audioEngine.ensureStarted();
      this.audioEngine.silenceAll();
      this.transports.forEach((transport) => transport.stop());
      const startAt = context.currentTime + 0.08;
      this.project.orbitas.forEach((orbita) => {
        const transport = new OrbitaTransport(orbita);
        transport.start(startAt);
        this.transports.set(orbita.id, transport);
        this.views.get(orbita.id)?.setRunning(true);
      });
      this.announce('모든 Orbita를 처음부터 재생합니다.');
    } catch (error) {
      this.showToast('오디오를 시작하지 못했습니다. 화면을 터치한 뒤 다시 시도해주세요.');
    }
  }

  stopAll() {
    this.audioEngine.silenceAll();
    this.transports.forEach((transport, id) => {
      transport.stop();
      this.views.get(id)?.setRunning(false);
      this.views.get(id)?.setPhase(0);
    });
    this.announce('모든 Orbita를 정지했습니다.');
  }

  startLoops() {
    this.schedulerTimer = window.setInterval(() => {
      const context = this.audioEngine.context;
      if (!context) return;
      for (const [id, transport] of this.transports) {
        if (!transport.running) continue;
        transport.schedule(context.currentTime, 0.1, ({ chip, audioTime }) => {
          const orbita = this.project.orbitas.find((item) => item.id === id);
          if (!orbita) return;
          this.audioEngine.trigger(orbita, chip, audioTime);
          const delay = Math.max(0, (audioTime - context.currentTime) * 1000);
          window.setTimeout(() => this.views.get(id)?.flashTrack(chip.trackIndex), delay);
        });
      }
    }, 25);

    const draw = () => {
      const context = this.audioEngine.context;
      if (context) {
        for (const [id, transport] of this.transports) {
          if (transport.running) this.views.get(id)?.setPhase(transport.phaseAt(context.currentTime));
        }
      }
      this.animationFrame = window.requestAnimationFrame(draw);
    };
    this.animationFrame = window.requestAnimationFrame(draw);
  }

  requestSave() {
    this.elements.saveStatus.textContent = '저장 중';
    this.elements.saveStatus.classList.remove('error');
    this.store.scheduleSave(this.project, (result) => {
      this.elements.saveStatus.textContent = result.ok ? '저장됨' : '저장 실패';
      this.elements.saveStatus.classList.toggle('error', !result.ok);
      if (!result.ok) this.showToast(result.message);
    });
  }

  async importFile(event) {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    try {
      const project = this.store.parseImportedJson(await file.text());
      this.stopAll();
      this.project = project;
      this.audioEngine.setMasterVolume(project.masterVolume);
      this.elements.masterVolume.value = String(project.masterVolume);
      this.transports.clear();
      this.selectedChipIds.clear();
      this.focusedIndex = 0;
      this.requestSave();
      this.render();
      this.showToast('프로젝트를 불러왔습니다.');
    } catch (error) {
      this.showToast(`불러오기 실패: ${error.message}`);
    }
  }

  showToast(message) {
    const { toast } = this.elements;
    window.clearTimeout(this.toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    this.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3600);
  }

  announce(message) {
    this.elements.liveRegion.textContent = '';
    window.setTimeout(() => { this.elements.liveRegion.textContent = message; }, 10);
  }
}
