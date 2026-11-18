import { createProject } from './core/project.js';
import { createProjectStore } from './storage/project-store.js';
import { AppController } from './ui/app-controller.js';

const store = createProjectStore(window.localStorage);
let project;
let loadError = null;

try {
  project = store.load() ?? createProject();
} catch (error) {
  project = createProject();
  loadError = error;
}

const controller = new AppController({
  project,
  store,
  elements: {
    stage: document.querySelector('#orbita-stage'),
    playAll: document.querySelector('#play-all'),
    stopAll: document.querySelector('#stop-all'),
    masterVolume: document.querySelector('#master-volume'),
    saveStatus: document.querySelector('#save-status'),
    exportButton: document.querySelector('#export-project'),
    importButton: document.querySelector('#import-project'),
    fileInput: document.querySelector('#project-file'),
    viewButtons: [...document.querySelectorAll('[data-view]')],
    toast: document.querySelector('#toast'),
    liveRegion: document.querySelector('#live-region'),
  },
});

if (loadError) controller.showToast('저장된 프로젝트가 손상되어 새 프로젝트로 시작했습니다.');

if (new URLSearchParams(window.location.search).has('audioTest')) {
  window.__orbitaAudioTest = async () => {
    const context = await controller.audioEngine.ensureStarted();
    const orbita = controller.project.orbitas[0];
    controller.audioEngine.trigger(orbita, { colorIndex: 0, trackIndex: 2, angle: 0 }, context.currentTime + 0.05);
  };
}
