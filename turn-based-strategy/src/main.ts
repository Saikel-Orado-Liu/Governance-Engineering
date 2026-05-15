import { MapGenerator } from './map/MapGenerator';
import { MapRenderer } from './map/MapRenderer';
import { UnitManager } from './unit/UnitManager';
import { MovementEngine } from './unit/MovementEngine';
import { executeCombat } from './unit/CombatSystem';
import { useAbility } from './unit/AbilitySystem';
import { AbilityType, ABILITY_CONFIGS } from './unit/AbilityConfig';
import type { AbilityConfig } from './unit/AbilityConfig';
import { TurnManager, type EnemyAction } from './unit/TurnManager';
import type { SkillFunction } from './unit/EnemyAI';
import { Phase } from './unit/PhaseTypes';
import { GRID_SIZE } from './map/MapGrid';
import { DeployManager } from './unit/DeployManager';
import { DEFAULT_GAME_CONFIG } from './config/GameConfig';
import { DIRECTION_OFFSETS } from './core/Coordinate';
import type { Unit } from './unit/Unit';
import { AnimationManager } from './render/AnimationManager';
import { StartScreen } from './ui/StartScreen';
import { ActionPanel } from './ui/ActionPanel';
import { HUD } from './ui/HUD';
import { screenToWorld } from './render/IsometricRenderer';

const startScreen = new StartScreen(() => {
  startGame();
});
startScreen.show();

function startGame(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const gameContainer = document.getElementById('game-container')!;

  // Show game container
  gameContainer.style.display = 'block';

  const generator = new MapGenerator();
  const grid = generator.generate();

  const manager = new UnitManager(grid);
  const movementEngine = new MovementEngine(manager);
  const useSkillFn: SkillFunction = (caster, target, mgr) => {
    return useAbility(caster, target, caster.skill, ABILITY_CONFIGS[caster.skill], mgr);
  };
  const turnManager = new TurnManager(grid, manager, executeCombat, useSkillFn);
  const deployManager = new DeployManager(manager, DEFAULT_GAME_CONFIG);

  let selectedUnit: Unit | null = null;
  let reachableCells: { row: number; col: number }[] = [];
  let attackTargets: { row: number; col: number }[] = [];
  let combatInProgress = false;
  let selectedSkill: AbilityType | null = null;
  let skillRangeCells: { row: number; col: number }[] = [];
  let skillTargetCells: { row: number; col: number }[] = [];

  function getAdjacentEnemies(unit: Unit): Unit[] {
    const enemies: Unit[] = [];
    for (const [dr, dc] of DIRECTION_OFFSETS) {
      const nr = unit.row + dr;
      const nc = unit.col + dc;
      const u = manager.getUnitAt(nr, nc);
      if (u && u.team !== unit.team && u.isAlive()) {
        enemies.push(u);
      }
    }
    return enemies;
  }

  function getAbilityRangeCells(caster: Unit, config: AbilityConfig): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    for (let dr = -config.range; dr <= config.range; dr++) {
      for (let dc = -config.range; dc <= config.range; dc++) {
        if (Math.abs(dr) + Math.abs(dc) > config.range) continue;
        const nr = caster.row + dr;
        const nc = caster.col + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          cells.push({ row: nr, col: nc });
        }
      }
    }
    return cells;
  }

  function getAbilityTargetsForSkill(
    caster: Unit,
    skill: AbilityType,
    config: AbilityConfig,
    unitManager: UnitManager,
  ): { row: number; col: number }[] {
    const enemies = unitManager.getUnitsByTeam(1).filter(u => u.isAlive());
    return enemies.filter(enemy => {
      const dist = Math.abs(caster.row - enemy.row) + Math.abs(caster.col - enemy.col);
      if (dist > config.range) return false;
      if (skill === AbilityType.Charge) {
        if (caster.row !== enemy.row && caster.col !== enemy.col) return false;
      }
      return true;
    }).map(u => ({ row: u.row, col: u.col }));
  }

  function processEnemyActions(actions: EnemyAction[], index: number): void {
    if (index >= actions.length) {
      turnManager.startPlayerTurn();
      updateView();
      return;
    }

    const action = actions[index];

    if (action.action === 'attack' && action.combatResult) {
      const flashing: Unit[] = [];
      if (action.combatResult.defender.isAlive() && action.combatResult.damageDealt > 0) {
        flashing.push(action.combatResult.defender);
      }
      if (action.combatResult.attacker.isAlive() && action.combatResult.damageReceived > 0) {
        flashing.push(action.combatResult.attacker);
      }
      renderer.setFlashingUnits(flashing);
      updateView();
      setTimeout(() => {
        renderer.clearFlashingUnits();
        updateView();
        setTimeout(() => processEnemyActions(actions, index + 1), 200);
      }, 400);
    } else if (action.action === 'move') {
      updateView();
      setTimeout(() => processEnemyActions(actions, index + 1), 300);
    } else if (action.action === 'skill') {
      if (action.target) {
        renderer.setFlashingUnits([action.target]);
      }
      updateView();
      setTimeout(() => {
        renderer.clearFlashingUnits();
        updateView();
        setTimeout(() => processEnemyActions(actions, index + 1), 200);
      }, 400);
    } else {
      setTimeout(() => processEnemyActions(actions, index + 1), 200);
    }
  }

  function updateView(): void {
    renderer.render(grid, manager.getAllUnits());
    renderer.renderAttackHighlights(attackTargets);
    renderer.renderHighlights(reachableCells);
    if (selectedSkill !== null) {
      renderer.renderAbilityRange(skillRangeCells, 'rgba(41, 128, 185, 0.2)');
      renderer.renderAbilityTargets(skillTargetCells);
    }
    hud.renderMinimap(grid, manager.getAllUnits());
  }

  // --- Animation Manager ---
  const animationManager = new AnimationManager();

  // --- Helper to build actedUnits set from TurnManager state ---
  function getActedUnits(): Set<Unit> {
    return new Set(manager.getUnitsByTeam(0).filter(u => turnManager.hasUnitActed(u)));
  }

  // --- Action Panel ---
  const actionPanel = new ActionPanel({
    onSkillSelect: (skillType: AbilityType) => {
      const unit = manager.getUnitsByTeam(0).find(u =>
        u.isAlive() && u.skill === skillType && !turnManager.hasUnitActed(u),
      );
      if (!unit) return;

      if (selectedUnit === unit && selectedSkill === skillType) {
        // Toggle off
        selectedSkill = null;
        selectedUnit = null;
        renderer.setSelectedUnit(null);
        skillRangeCells = [];
        skillTargetCells = [];
        attackTargets = [];
      } else {
        selectedUnit = unit;
        renderer.setSelectedUnit(unit);
        selectedSkill = skillType;
        const config = ABILITY_CONFIGS[skillType];
        skillRangeCells = getAbilityRangeCells(unit, config);
        skillTargetCells = getAbilityTargetsForSkill(unit, skillType, config, manager);
        attackTargets = [];
      }
      updateView();
      updateActionPanel();
    },
  });

  function updateActionPanel(): void {
    const playerUnits = manager.getUnitsByTeam(0);
    const unacted = playerUnits.filter(u =>
      u.isAlive() && !turnManager.hasUnitActed(u) && !u.effects.some(e => e.type === 'skipTurn'),
    );
    actionPanel.update(selectedUnit, false, unacted, getActedUnits(), selectedSkill);
    if (selectedUnit && selectedUnit.isAlive()) {
      actionPanel.showAt(selectedUnit.row, selectedUnit.col, canvas, renderer);
    } else {
      actionPanel.hide();
    }
  }

  // --- HUD ---
  const hud = new HUD({
    onEndTurn: () => {
      const state = turnManager.getState();

      if (state === Phase.PlayerMove) {
        renderer.setSelectedUnit(null);
        selectedUnit = null;
        reachableCells = [];

        turnManager.endPlayerTurn();

        // Process skipTurn effects on player units
        const playerUnits = manager.getUnitsByTeam(0);
        for (const unit of playerUnits) {
          const skipEffect = unit.effects.find(e => e.type === 'skipTurn');
          if (skipEffect) {
            turnManager.markUnitActed(unit);
            skipEffect.duration--;
          }
        }
        for (const unit of playerUnits) {
          unit.effects = unit.effects.filter(e => e.duration > 0);
        }

        updateView();
        updateActionPanel();
      } else if (state === Phase.PlayerCombat) {
        if (combatInProgress) return;

        renderer.setSelectedUnit(null);
        selectedUnit = null;
        attackTargets = [];

        const actions = turnManager.endPlayerCombat();

        if (turnManager.getState() === Phase.End) {
          const playerAlive = manager.getUnitsByTeam(0).length > 0;
          updateView();
          setTimeout(() => alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!'), 200);
          return;
        }

        processEnemyActions(actions, 0);
      }
    },
    onPause: () => {
      hud.showPauseMenu();
    },
    onRestart: () => {
      location.reload();
    },
  });

  // --- Tooltip ---
  const tooltip = document.getElementById('tooltip')!;
  const UNIT_TYPE_NAMES: Record<number, string> = { 0: '战士', 1: '弓手', 2: '骑士', 3: '法师' };

  // --- Renderer ---
  const renderer = new MapRenderer({
    canvas,
    onClick: (row: number, col: number) => {
      const state = turnManager.getState();

      // --- PlayerCombat phase ---
      if (state === Phase.PlayerCombat) {
        const clickedUnit = manager.getUnitAt(row, col);

        // --- Skill mode ---
        if (selectedSkill !== null) {
          // Click on skill target enemy -> execute ability
          if (clickedUnit && clickedUnit.team !== 0 && clickedUnit.isAlive() &&
              skillTargetCells.some(t => t.row === row && t.col === col)) {
            if (!selectedUnit || !selectedUnit.isAlive() || turnManager.hasUnitActed(selectedUnit)) {
              // Invalid state — reset
              selectedSkill = null;
              skillRangeCells = [];
              skillTargetCells = [];
              selectedUnit = null;
              renderer.setSelectedUnit(null);
              attackTargets = [];
              updateView();
              updateActionPanel();
              return;
            }
            const config = ABILITY_CONFIGS[selectedSkill];
            useAbility(selectedUnit, clickedUnit, selectedSkill, config, manager);
            turnManager.markUnitActed(selectedUnit);
            selectedSkill = null;
            skillRangeCells = [];
            skillTargetCells = [];
            attackTargets = [];
            renderer.setFlashingUnits([clickedUnit]);
            updateView();

            const gameOver = turnManager.isGameOver();
            combatInProgress = true;

            setTimeout(() => {
              try {
                renderer.clearFlashingUnits();
                updateView();
                updateActionPanel();
                if (gameOver) {
                  turnManager.endPlayerCombat();
                  const playerAlive = manager.getUnitsByTeam(0).length > 0;
                  alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!');
                } else if (turnManager.getState() === Phase.PlayerCombat && turnManager.isAllUnitsActed()) {
                  const actions = turnManager.endPlayerCombat();
                  if (turnManager.getState() === Phase.End) {
                    const playerAlive = manager.getUnitsByTeam(0).length > 0;
                    setTimeout(() => alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!'), 200);
                  } else {
                    processEnemyActions(actions, 0);
                  }
                }
              } finally {
                combatInProgress = false;
              }
            }, 400);
            return;
          }

          // Click on own unacted unit -> switch selection, recalculate skill
          if (clickedUnit && clickedUnit.team === 0 && clickedUnit.isAlive() && !turnManager.hasUnitActed(clickedUnit)) {
            selectedUnit = clickedUnit;
            renderer.setSelectedUnit(clickedUnit);
            const config = ABILITY_CONFIGS[selectedSkill];
            skillRangeCells = getAbilityRangeCells(clickedUnit, config);
            skillTargetCells = getAbilityTargetsForSkill(clickedUnit, selectedSkill, config, manager);
            attackTargets = [];
            updateView();
            updateActionPanel();
            return;
          }

          // Click on empty space or acted unit -> cancel skill mode, return to basic attack mode
          selectedSkill = null;
          skillRangeCells = [];
          skillTargetCells = [];
          if (selectedUnit && selectedUnit.isAlive() && !turnManager.hasUnitActed(selectedUnit)) {
            attackTargets = getAdjacentEnemies(selectedUnit).map(u => ({ row: u.row, col: u.col }));
          } else {
            selectedUnit = null;
            renderer.setSelectedUnit(null);
            attackTargets = [];
          }
          updateView();
          updateActionPanel();
          return;
        }

        // --- Basic attack mode (selectedSkill === null) ---
        if (clickedUnit && clickedUnit.team === 0 && clickedUnit.isAlive() && !turnManager.hasUnitActed(clickedUnit)) {
          selectedUnit = clickedUnit;
          renderer.setSelectedUnit(clickedUnit);
          attackTargets = getAdjacentEnemies(clickedUnit).map(u => ({ row: u.row, col: u.col }));
          updateView();
        } else if (selectedUnit && selectedUnit.isAlive() && !turnManager.hasUnitActed(selectedUnit)) {
          const target = manager.getUnitAt(row, col);
          if (target && target.team !== 0 && attackTargets.some(t => t.row === row && t.col === col)) {
            executeCombat(selectedUnit, target, manager);
            turnManager.markUnitActed(selectedUnit);
            attackTargets = [];
            renderer.setFlashingUnits([target]);
            updateView();

            const gameOver = turnManager.isGameOver();
            combatInProgress = true;

            setTimeout(() => {
              try {
                renderer.clearFlashingUnits();
                updateView();
                updateActionPanel();
                if (gameOver) {
                  turnManager.endPlayerCombat();
                  const playerAlive = manager.getUnitsByTeam(0).length > 0;
                  alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!');
                } else if (turnManager.getState() === Phase.PlayerCombat && turnManager.isAllUnitsActed()) {
                  const actions = turnManager.endPlayerCombat();
                  if (turnManager.getState() === Phase.End) {
                    const playerAlive = manager.getUnitsByTeam(0).length > 0;
                    setTimeout(() => alert(playerAlive ? 'Player Wins!' : 'Enemy Wins!'), 200);
                  } else {
                    processEnemyActions(actions, 0);
                  }
                }
              } finally {
                combatInProgress = false;
              }
            }, 400);
          } else {
            selectedUnit = null;
            renderer.setSelectedUnit(null);
            attackTargets = [];
            updateView();
          }
        } else {
          selectedUnit = null;
          renderer.setSelectedUnit(null);
          attackTargets = [];
          updateView();
        }
        return;
      }

      // --- PlayerMove phase ---
      if (state !== Phase.PlayerMove) {
        selectedUnit = null;
        renderer.setSelectedUnit(null);
        reachableCells = [];
        updateView();
        return;
      }

      const clickedUnit = manager.getUnitAt(row, col);

      if (clickedUnit && clickedUnit.team === 0 && !clickedUnit.movedThisTurn && !clickedUnit.effects.some(e => e.type === 'skipTurn')) {
        selectedUnit = clickedUnit;
        renderer.setSelectedUnit(clickedUnit);
        reachableCells = movementEngine.getReachableCells(grid, clickedUnit);
        updateView();
      } else if (selectedUnit && reachableCells.some(c => c.row === row && c.col === col)) {
        const fromRow = selectedUnit.row;
        const fromCol = selectedUnit.col;
        const moved = manager.moveUnit(selectedUnit, row, col);
        if (moved) {
          animationManager.startMoveAnimation(selectedUnit, fromRow, fromCol, row, col, 200, () => updateView());
          selectedUnit.movedThisTurn = true;
          selectedUnit = null;
          renderer.setSelectedUnit(null);
          reachableCells = [];
          updateView();
        }
      } else {
        selectedUnit = null;
        renderer.setSelectedUnit(null);
        reachableCells = [];
        updateView();
      }
    },
  });

  renderer.setAnimationManager(animationManager);

  // --- Tooltip (mousemove/mouseleave) ---
  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const coord = screenToWorld(x, y, renderer.originX, renderer.originY, renderer.scale);
    const row = coord.row;
    const col = coord.col;

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      const u = manager.getUnitAt(row, col);
      if (u && u.isAlive()) {
        const name = UNIT_TYPE_NAMES[u.type] ?? u.type;
        tooltip.innerHTML = `${name}<br>HP: ${u.hp}/${u.maxHp}  ATK: ${u.atk}  DEF: ${u.def}`;
        tooltip.style.display = 'block';

        let left = e.clientX + 12;
        let top = e.clientY + 12;
        const tipWidth = 180;
        const tipHeight = 50;
        if (left + tipWidth > window.innerWidth) {
          left = e.clientX - tipWidth - 12;
        }
        left = Math.max(0, left);
        if (top + tipHeight > window.innerHeight) {
          top = e.clientY - tipHeight - 12;
        }
        top = Math.max(0, top);
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      } else {
        tooltip.style.display = 'none';
      }
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });

  // --- Phase change subscription ---
  const guideTexts: Record<string, string> = {
    [Phase.PlayerMove]: '点击己方单位选中 → 点击高亮格移动',
    [Phase.PlayerCombat]: '点击己方单位 → 攻击或使用技能',
    [Phase.EnemyAI]: '敌方回合中，请等待...',
    [Phase.End]: '游戏结束，刷新页面重新开始',
  };

  turnManager.onPhaseChange.add((_from, to) => {
    const currentTeam = turnManager.getCurrentTeam();
    hud.setPhase(to, currentTeam);
    hud.setEndTurnDisabled(to !== Phase.PlayerMove && to !== Phase.PlayerCombat);
    hud.setEndTurnText(to === Phase.PlayerMove ? '结束移动' : '结束战斗');
    hud.setGuideText(guideTexts[to] ?? '');

    if (to === Phase.PlayerCombat) {
      updateActionPanel();
    }
    if (_from === Phase.PlayerCombat) {
      selectedSkill = null;
      skillRangeCells = [];
      skillTargetCells = [];
      actionPanel.update(null, false, [], new Set(), null);
      actionPanel.hide();
    }
  });

  hud.setEndTurnDisabled(turnManager.getState() !== Phase.PlayerMove);
  hud.setEndTurnText('结束移动');

  // Execute initial deployment
  deployManager.executeDeploy();
  // Complete deploy phase — transitions state to PlayerMove
  turnManager.completeDeploy();

  // Initial UI state
  const initialTeam = turnManager.getCurrentTeam();
  hud.setPhase(turnManager.getState(), initialTeam);
  hud.setGuideText(guideTexts[turnManager.getState()] ?? '');

  // Resize renderer to fill viewport and listen for resize
  function onResize(): void {
    renderer.resize(window.innerWidth, window.innerHeight);
    updateView();
  }
  window.addEventListener('resize', onResize);
  onResize();

  updateView();
}
