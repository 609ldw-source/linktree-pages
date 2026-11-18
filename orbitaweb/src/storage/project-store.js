import { validateProject } from '../core/project.js';

const STORAGE_KEY = 'orbita-web:project';

export function createProjectStore(storage, { delay = 300 } = {}) {
  let timer = null;
  let pendingProject = null;
  let pendingCallback = null;

  function persist() {
    if (!pendingProject) return { ok: true };
    const project = pendingProject;
    const callback = pendingCallback;
    pendingProject = null;
    pendingCallback = null;
    if (timer) clearTimeout(timer);
    timer = null;

    try {
      const validated = validateProject(project);
      storage.setItem(STORAGE_KEY, JSON.stringify(validated));
      const result = { ok: true };
      callback?.(result);
      return result;
    } catch (error) {
      const result = { ok: false, message: `자동 저장 실패: ${error.message}` };
      callback?.(result);
      return result;
    }
  }

  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      try {
        return validateProject(JSON.parse(raw));
      } catch (error) {
        throw new Error(`저장된 프로젝트를 읽을 수 없습니다: ${error.message}`);
      }
    },

    scheduleSave(project, callback) {
      pendingProject = project;
      pendingCallback = callback ?? pendingCallback;
      if (timer) clearTimeout(timer);
      timer = setTimeout(persist, delay);
    },

    flush() {
      return persist();
    },

    parseImportedJson(text) {
      let value;
      try {
        value = JSON.parse(text);
      } catch (error) {
        throw new Error(`JSON 형식이 올바르지 않습니다: ${error.message}`);
      }
      return validateProject(value);
    },

    exportJson(project) {
      const validated = validateProject(project);
      const json = JSON.stringify(validated, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `orbita-project-${date}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  };
}
