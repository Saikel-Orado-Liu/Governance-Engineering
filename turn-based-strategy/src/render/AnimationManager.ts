import type { Unit } from '../unit/Unit';

type AnimationCallback = (unit: Unit, progress: number) => void;

interface ActiveAnimation {
  unit: Unit;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  startTime: number;
  duration: number;
  onFrame?: AnimationCallback;
}

export type VisualPosition =
  | { row: number; col: number }
  | { vx: number; vy: number };

export class AnimationManager {
  private animations: Map<Unit, ActiveAnimation> = new Map();
  private rafId: number | null = null;

  startMoveAnimation(
    unit: Unit,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    durationMs: number = 200,
    onFrame?: AnimationCallback,
  ): void {
    this.animations.set(unit, {
      unit,
      fromRow,
      fromCol,
      toRow,
      toCol,
      startTime: performance.now(),
      duration: durationMs,
      onFrame,
    });
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  getVisualPosition(unit: Unit): VisualPosition {
    const anim = this.animations.get(unit);
    if (!anim) {
      return { row: unit.row, col: unit.col };
    }
    const elapsed = performance.now() - anim.startTime;
    const t = Math.min(elapsed / anim.duration, 1);
    const ease = easeInOutQuad(t);
    return {
      vx: anim.fromCol + (anim.toCol - anim.fromCol) * ease,
      vy: anim.fromRow + (anim.toRow - anim.fromRow) * ease,
    };
  }

  isAnimating(unit: Unit): boolean {
    return this.animations.has(unit);
  }

  cancelAll(): void {
    this.animations.clear();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(): void {
    const now = performance.now();
    const completed: Unit[] = [];

    for (const [unit, anim] of this.animations.entries()) {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.duration) {
        unit.setPosition(anim.toRow, anim.toCol);
        anim.onFrame?.(unit, 1);
        completed.push(unit);
      } else {
        const progress = elapsed / anim.duration;
        anim.onFrame?.(unit, progress);
      }
    }

    for (const unit of completed) {
      this.animations.delete(unit);
    }

    if (this.animations.size > 0) {
      this.rafId = requestAnimationFrame(() => this.tick());
    } else {
      this.rafId = null;
    }
  }
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
