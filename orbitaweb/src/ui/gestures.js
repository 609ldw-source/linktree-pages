import { DRUM_COLORS, PITCH_COLORS, TRACK_RADII } from '../constants.js';
import { resolveDropAction } from '../core/interaction.js';
import { normalizeAngle, pointToPlacement, quantizeAngle } from '../core/music.js';

function placementTransform(placement) {
  const radius = TRACK_RADII[placement.trackIndex];
  const radians = placement.angle * Math.PI * 2;
  const x = 200 + Math.sin(radians) * radius;
  const y = 200 - Math.cos(radians) * radius;
  return `translate(${x} ${y})`;
}

function showDeleteAction(view, chipId, handlers) {
  view.root.querySelector('.chip-delete-popover')?.remove();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip-delete-popover';
  button.textContent = '칩 삭제';
  button.addEventListener('click', () => handlers.onDeleteChip(chipId));
  view.platterWrap.append(button);
  window.setTimeout(() => {
    const dismiss = (event) => {
      if (!button.contains(event.target)) button.remove();
      document.removeEventListener('pointerdown', dismiss, true);
    };
    document.addEventListener('pointerdown', dismiss, true);
  }, 0);
}

function attachKeyboard(view, state, handlers) {
  view.root.querySelectorAll('[data-chip-id]').forEach((element) => {
    element.addEventListener('click', () => handlers.onSelectChip(element.dataset.chipId));
    element.addEventListener('keydown', (event) => {
      const chip = state.chips.find((item) => item.id === element.dataset.chipId);
      if (!chip) return;
      const next = { trackIndex: chip.trackIndex, angle: chip.angle };
      const angleStep = state.snapMode === 'snap' ? 1 / 16 : 1 / 64;

      if (event.key === 'ArrowLeft') next.angle = normalizeAngle(next.angle - angleStep);
      else if (event.key === 'ArrowRight') next.angle = normalizeAngle(next.angle + angleStep);
      else if (event.key === 'ArrowUp') next.trackIndex = Math.min(4, next.trackIndex + 1);
      else if (event.key === 'ArrowDown') next.trackIndex = Math.max(0, next.trackIndex - 1);
      else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        handlers.onDeleteChip(chip.id);
        return;
      } else if (event.key === 'Escape') {
        handlers.onSelectChip(null);
        return;
      } else return;

      event.preventDefault();
      next.angle = quantizeAngle(next.angle, state.snapMode);
      handlers.onMoveChip(chip.id, next);
    });
  });
}

function attachSwipe(view, handlers) {
  const head = view.root.querySelector('.card-head');
  let start = null;
  head.addEventListener('pointerdown', (event) => {
    start = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    head.setPointerCapture(event.pointerId);
  });
  head.addEventListener('pointerup', (event) => {
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      handlers.onSwipe(dx < 0 ? 1 : -1);
    }
  });
  head.addEventListener('pointercancel', () => { start = null; });
}

export function attachGestures(view, state, handlers) {
  const colors = state.sourcePack === 'drums' ? DRUM_COLORS : PITCH_COLORS;
  const trashZone = view.root.querySelector('.chip-trash-zone');
  let drag = null;
  let armedColorIndex = null;

  function pointerPlacement(event) {
    const visualPlacement = pointToPlacement(
      event.clientX,
      event.clientY,
      view.svg.getBoundingClientRect(),
      'free',
    );
    if (!visualPlacement) return null;
    return {
      trackIndex: visualPlacement.trackIndex,
      angle: quantizeAngle(visualPlacement.angle + (view.phase || 0), state.snapMode),
    };
  }

  function cancelLongPress() {
    if (drag?.longPressTimer) window.clearTimeout(drag.longPressTimer);
    if (drag) drag.longPressTimer = null;
  }

  function beginDrag(event, source) {
    if (event.button !== undefined && event.button !== 0) return;
    const chipId = source.dataset.chipId ?? null;
    const colorIndex = source.dataset.paletteColor !== undefined
      ? Number(source.dataset.paletteColor)
      : state.chips.find((chip) => chip.id === chipId)?.colorIndex;
    const originalTransform = chipId ? source.getAttribute('transform') : null;

    drag = {
      pointerId: event.pointerId,
      source,
      chipId,
      colorIndex,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      placement: null,
      originalTransform,
      preview: null,
      longPressTimer: null,
      overTrash: false,
    };

    source.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveDrag, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
    if (chipId) {
      drag.longPressTimer = window.setTimeout(() => {
        if (drag && !drag.moved) showDeleteAction(view, chipId, handlers);
      }, 550);
    }
    event.preventDefault();
  }

  function ensurePreview() {
    if (drag.preview || drag.chipId) return;
    const namespace = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(namespace, 'g');
    group.classList.add('chip-preview');
    const circle = document.createElementNS(namespace, 'circle');
    circle.setAttribute('r', '11');
    circle.setAttribute('fill', colors[drag.colorIndex].hex);
    circle.setAttribute('stroke', 'rgba(255,255,255,.7)');
    circle.setAttribute('stroke-width', '2');
    group.append(circle);
    view.root.querySelector('.chips-layer').append(group);
    drag.preview = group;
  }

  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (distance > 8) {
      drag.moved = true;
      cancelLongPress();
    }
    if (!drag.moved) return;
    event.preventDefault();
    const trashRect = drag.chipId ? trashZone?.getBoundingClientRect() : null;
    drag.overTrash = Boolean(trashRect
      && event.clientX >= trashRect.left
      && event.clientX <= trashRect.right
      && event.clientY >= trashRect.top
      && event.clientY <= trashRect.bottom);
    trashZone?.classList.toggle('drag-over', drag.overTrash);
    view.root.classList.toggle('is-dragging-chip', Boolean(drag.chipId));

    if (drag.overTrash) {
      drag.placement = null;
      drag.source.style.opacity = '0.3';
      return;
    }

    const placement = pointerPlacement(event);
    drag.placement = placement;
    ensurePreview();
    const movingElement = drag.preview || drag.source;
    if (placement) {
      movingElement.setAttribute('transform', placementTransform(placement));
      movingElement.style.opacity = '1';
    } else {
      movingElement.style.opacity = '0.35';
    }
  }

  function endDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    window.removeEventListener('pointermove', moveDrag, true);
    window.removeEventListener('pointerup', endDrag, true);
    window.removeEventListener('pointercancel', endDrag, true);
    cancelLongPress();
    drag.preview?.remove();
    trashZone?.classList.remove('drag-over');
    view.root.classList.remove('is-dragging-chip');

    const completedDrag = drag;
    const action = completedDrag.moved
      ? resolveDropAction({
        isExisting: Boolean(completedDrag.chipId),
        overTrash: completedDrag.overTrash,
        placement: completedDrag.placement,
      })
      : null;
    drag = null;

    if (action === 'delete') {
      handlers.onDeleteChip(completedDrag.chipId);
    } else if (action === 'move') {
      handlers.onMoveChip(completedDrag.chipId, completedDrag.placement);
    } else if (action === 'add') {
      handlers.onAddChip(completedDrag.colorIndex, completedDrag.placement);
    } else if (completedDrag.chipId) {
      completedDrag.source.setAttribute('transform', completedDrag.originalTransform);
      completedDrag.source.style.opacity = '1';
      if (!completedDrag.moved) handlers.onSelectChip(completedDrag.chipId);
    } else if (!completedDrag.moved) {
      handlers.onPreviewChip(completedDrag.colorIndex, 2);
      armedColorIndex = armedColorIndex === completedDrag.colorIndex ? null : completedDrag.colorIndex;
      view.root.querySelectorAll('.palette-chip').forEach((item) => {
        const armed = Number(item.dataset.paletteColor) === armedColorIndex;
        item.classList.toggle('armed', armed);
        item.setAttribute('aria-pressed', String(armed));
      });
    }

  }

  view.root.querySelectorAll('.palette-chip, [data-chip-id]').forEach((source) => {
    source.addEventListener('pointerdown', (event) => beginDrag(event, source));
    source.addEventListener('pointermove', moveDrag);
    source.addEventListener('pointerup', endDrag);
    source.addEventListener('pointercancel', endDrag);
  });

  view.svg.addEventListener('click', (event) => {
    if (armedColorIndex === null || event.target.closest('[data-chip-id]')) return;
    const placement = pointerPlacement(event);
    if (!placement) return;
    handlers.onAddChip(armedColorIndex, placement);
    armedColorIndex = null;
  });

  attachKeyboard(view, state, handlers);
  attachSwipe(view, handlers);
}
