export enum Phase {
  Deploy = 'deploy',
  PlayerMove = 'playerMove',
  PlayerCombat = 'playerCombat',
  EnemyAI = 'enemyAI',
  End = 'end',
}

export const PHASE_SEQUENCE: Phase[] = [
  Phase.Deploy,
  Phase.PlayerMove,
  Phase.PlayerCombat,
  Phase.EnemyAI,
  Phase.End,
];

export function canTransitionTo(current: Phase, next: Phase): boolean {
  const currentIndex = PHASE_SEQUENCE.indexOf(current);
  const nextIndex = PHASE_SEQUENCE.indexOf(next);
  // Allow loop: End → PlayerMove (restart after game over)
  if (current === Phase.End && next === Phase.PlayerMove) return true;
  // Allow loop: EnemyAI → PlayerMove (turn cycle)
  if (current === Phase.EnemyAI && next === Phase.PlayerMove) return true;
  // Allow game over: PlayerCombat → End (skip EnemyAI when one side is eliminated)
  if (current === Phase.PlayerCombat && next === Phase.End) return true;
  return nextIndex === currentIndex + 1;
}
