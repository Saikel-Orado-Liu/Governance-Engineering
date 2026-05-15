export class StartScreen {
  private onStart: () => void;
  private overlay: HTMLDivElement | null = null;

  constructor(onStart: () => void) {
    this.onStart = onStart;
  }

  show(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'start-screen';
    this.overlay.className = 'start-content';
    this.overlay.style.cssText = [
      'position: fixed',
      'inset: 0',
      'background: rgba(0,0,0,0.85)',
      'display: flex',
      'flex-direction: column',
      'justify-content: center',
      'align-items: center',
      'z-index: 1000',
      'transition: opacity 0.3s ease',
    ].join(';');

    const title = document.createElement('h1');
    title.textContent = '回合制策略战棋';

    const desc = document.createElement('p');
    desc.textContent = '在 8x8 战场上指挥你的部队，运用战术击败敌人。';

    const rules = document.createElement('p');
    rules.textContent = '点击己方单位移动，靠近敌人后进入战斗阶段。合理使用技能赢得胜利！';

    const startBtn = document.createElement('button');
    startBtn.textContent = '开始游戏';
    startBtn.addEventListener('click', () => {
      this.onStart();
      this.hide();
    });

    this.overlay.appendChild(title);
    this.overlay.appendChild(desc);
    this.overlay.appendChild(rules);
    this.overlay.appendChild(startBtn);
    document.body.appendChild(this.overlay);
  }

  hide(): void {
    if (!this.overlay) return;
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
        this.overlay = null;
      }
    }, 300);
  }
}
