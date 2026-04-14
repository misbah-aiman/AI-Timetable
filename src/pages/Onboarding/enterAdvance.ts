import type { KeyboardEvent } from 'react';

/** Move focus on Enter; last callback can advance the step. */
export function chainEnter(
  e: KeyboardEvent,
  next?: () => void
): void {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  next?.();
}
