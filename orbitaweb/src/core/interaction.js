export function resolveDropAction({ isExisting, overTrash, placement }) {
  if (isExisting && overTrash) return 'delete';
  if (placement) return isExisting ? 'move' : 'add';
  return isExisting ? 'rollback' : 'cancel';
}
