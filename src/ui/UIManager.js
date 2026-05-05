import { GameState, GamePhase, CharacterType, WeaponType } from '../game/GameState.js';

/**
 * UI管理器
 * 负责管理所有UI屏幕的显示和切换
 */
export class UIManager {
  gameState;
  uiLayer;
  currentScreen = null;
  screens = new Map();
  hudElements = new Map();

  constructor(gameState) {
    this.gameState = gameState;
    this.uiLayer = document.getElementById('ui-layer');
    if (!this.uiLayer) {
      throw new Error('找不到UI层元素');
    }

    this.createStyles();
    this.setupScreens();
    this.setupHUD();
  }

  /**
   * 创建全局样式
   */
  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ui-screen {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.85);
        color: #d4af37;
        font-family: 'Microsoft YaHei', sans-serif;
        z-index: 100;
        transition: opacity 0.3s;
      }
      .ui-screen.hidden {
        display: none;
        opacity: 0;
      }
      .game-title {
        font-size: 64px;
        font-weight: bold;
        color: #d4af37;
        text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
        margin-bottom: 40px;
        letter-spacing: 8px;
      }
      .game-subtitle {
        font-size: 24px;
        color: #8b7355;
        margin-bottom: 60px;
        letter-spacing: 4px;
      }
      .btn {
        padding: 15px 60px;
        margin: 10px;
        font-size: 20px;
        background: transparent;
        border: 2px solid #d4af37;
        color: #d4af37;
        cursor: pointer;
        transition: all 0.3s;
        font-family: 'Microsoft YaHei', sans-serif;
        letter-spacing: 4px;
      }
      .btn:hover {
        background: #d4af37;
        color: #000;
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
      }
      .btn-small {
        padding: 8px 30px;
        font-size: 14px;
      }
      .character-card {
        display: inline-block;
        padding: 30px;
        margin: 15px;
        border: 2px solid #5c4a2a;
        background: rgba(0, 0, 0, 0.6);
        cursor: pointer;
        transition: all 0.3s;
        width: 220px;
      }
      .character-card:hover {
        border-color: #d4af37;
        background: rgba(212, 175, 55, 0.1);
        transform: translateY(-5px);
      }
      .character-card.selected {
        border-color: #d4af37;
        background: rgba(212, 175, 55, 0.2);
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
      }
      .stat-bar {
        width: 200px;
        height: 8px;
        background: #333;
        margin: 5px 0;
        position: relative;
      }
      .stat-bar-fill {
        height: 100%;
        background: #d4af37;
        transition: width 0.3s;
      }
      .hud-container {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 50;
      }
      .hud-container > * {
        pointer-events: auto;
      }
      .hud-top-left {
        position: absolute;
        top: 20px;
        left: 20px;
      }
      .hud-top-right {
        position: absolute;
        top: 20px;
        right: 20px;
        text-align: right;
      }
      .hud-bottom-right {
        position: absolute;
        bottom: 30px;
        right: 20px;
      }
      .health-bar {
        width: 300px;
        height: 20px;
        background: rgba(0, 0, 0, 0.6);
        border: 2px solid #d4af37;
        overflow: hidden;
      }
      .health-fill {
        height: 100%;
        background: #c0392b;
        transition: width 0.3s;
      }
      .stamina-bar {
        width: 200px;
        height: 10px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid #8b7355;
        overflow: hidden;
        margin-top: 5px;
      }
      .stamina-fill {
        height: 100%;
        background: #27ae60;
        transition: width 0.2s;
      }
      .money-display {
        font-size: 24px;
        color: #f1c40f;
        text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);
      }
      .crosshair {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        pointer-events: none;
      }
      .crosshair::before,
      .crosshair::after {
        content: '';
        position: absolute;
        background: rgba(255, 255, 255, 0.6);
      }
      .crosshair::before {
        width: 2px;
        height: 20px;
        left: 9px;
        top: 0;
      }
      .crosshair::after {
        width: 20px;
        height: 2px;
        left: 0;
        top: 9px;
      }
      .inventory-grid {
        display: grid;
        grid-template-columns: repeat(4, 80px);
        gap: 10px;
        margin: 20px;
      }
      .inventory-slot {
        width: 80px;
        height: 80px;
        border: 2px solid #5c4a2a;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .inventory-slot:hover {
        border-color: #d4af37;
      }
      .inventory-slot.selected {
        border-color: #d4af37;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
      }
      .inventory-slot .item-name {
        font-size: 12px;
        text-align: center;
        color: #d4af37;
      }
      .message-text {
        font-size: 32px;
        color: #e74c3c;
        text-shadow: 0 0 20px rgba(231, 76, 60, 0.5);
      }
      .success-text {
        font-size: 48px;
        color: #2ecc71;
        text-shadow: 0 0 20px rgba(46, 204, 113, 0.5);
      }
      .tutorial-content {
        max-width: 800px;
        max-height: 70vh;
        overflow-y: auto;
        text-align: left;
        padding: 20px;
      }
      .tutorial-step {
        margin: 20px 0;
        padding: 15px;
        border-left: 3px solid #d4af37;
        background: rgba(0, 0, 0, 0.4);
      }
      .tutorial-step h3 {
        color: #f1c40f;
        margin-bottom: 10px;
      }
      .key-hint {
        display: inline-block;
        padding: 4px 12px;
        margin: 2px;
        background: #333;
        border: 1px solid #666;
        border-radius: 4px;
        font-size: 14px;
        color: #fff;
      }
      .item-value {
        color: #f1c40f;
        font-weight: bold;
      }
      .rarity-common { color: #95a5a6; }
      .rarity-uncommon { color: #2ecc71; }
      .rarity-rare { color: #3498db; }
      .rarity-epic { color: #9b59b6; }
      .rarity-legendary { color: #e67e22; }
      .warehouse-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      .warehouse-tab {
        padding: 10px 30px;
        background: transparent;
        border: 2px solid #5c4a2a;
        color: #8b7355;
        cursor: pointer;
        transition: all 0.3s;
      }
      .warehouse-tab.active {
        border-color: #d4af37;
        color: #d4af37;
        background: rgba(212, 175, 55, 0.1);
      }
      .tips-box {
        background: rgba(212, 175, 55, 0.1);
        border: 1px solid #d4af37;
        padding: 15px;
        margin: 10px 0;
        border-radius: 5px;
      }
      .main-menu-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
        position: relative;
      }
      .menu-background {
        position: absolute;
        inset: 0;
        background-image: 
          radial-gradient(circle at 20% 50%, rgba(212, 175, 55, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(231, 76, 60, 0.05) 0%, transparent 50%);
        z-index: 0;
      }
      .character-showcase {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 60px;
        z-index: 1;
        margin-bottom: 40px;
      }
      .character-avatar {
        width: 200px;
        height: 280px;
        background: linear-gradient(180deg, rgba(212, 175, 55, 0.2) 0%, rgba(0,0,0,0.4) 100%);
        border: 3px solid #d4af37;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        animation: characterGlow 3s ease-in-out infinite;
        box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
      }
      .character-icon {
        font-size: 80px;
        margin-bottom: 10px;
      }
      .character-name-display {
        font-size: 24px;
        color: #d4af37;
        margin-bottom: 5px;
      }
      .change-character {
        font-size: 12px;
        color: #8b7355;
        cursor: pointer;
        text-decoration: underline;
        transition: color 0.3s;
      }
      .change-character:hover {
        color: #d4af37;
      }
      .menu-buttons {
        display: flex;
        flex-direction: column;
        gap: 15px;
        align-items: center;
      }
      .menu-btn-large {
        padding: 20px 80px;
        font-size: 28px;
        background: linear-gradient(135deg, #d4af37, #b8941f);
        border: none;
        color: #000;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
        border-radius: 5px;
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
        font-family: 'Microsoft YaHei', sans-serif;
        letter-spacing: 6px;
      }
      .menu-btn-large:hover {
        transform: scale(1.05);
        box-shadow: 0 0 40px rgba(212, 175, 55, 0.6);
      }
      .menu-btn-side {
        padding: 15px 40px;
        font-size: 18px;
        background: rgba(212, 175, 55, 0.15);
        border: 2px solid #d4af37;
        color: #d4af37;
        cursor: pointer;
        transition: all 0.3s;
        border-radius: 5px;
        font-family: 'Microsoft YaHei', sans-serif;
        letter-spacing: 3px;
      }
      .menu-btn-side:hover {
        background: rgba(212, 175, 55, 0.3);
        box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
      }
      .game-title-small {
        font-size: 48px;
        font-weight: bold;
        color: #d4af37;
        text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
        letter-spacing: 8px;
        z-index: 1;
        margin-bottom: 30px;
      }
      @keyframes characterGlow {
        0%, 100% { box-shadow: 0 0 30px rgba(212, 175, 55, 0.3); }
        50% { box-shadow: 0 0 50px rgba(212, 175, 55, 0.5); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 设置所有UI屏幕
   */
  setupScreens() {
    this.screens.set('main-menu', new MainMenuScreen(this.gameState));
    this.screens.set('tutorial', new TutorialScreen(this.gameState));
    this.screens.set('preparation', new PreparationScreen(this.gameState));
    this.screens.set('death-screen', new DeathScreen());
    this.screens.set('evacuation-success', new EvacuationSuccessScreen());
    this.screens.set('warehouse', new WarehouseScreen(this.gameState));
    this.screens.set('shop', new ShopScreen(this.gameState));

    for (const [name, screen] of this.screens) {
      screen.element.classList.add('ui-screen', 'hidden');
      this.uiLayer.appendChild(screen.element);
    }
  }

  /**
   * 设置HUD
   */
  setupHUD() {
    const hudContainer = document.createElement('div');
    hudContainer.className = 'hud-container hidden';

    // 左上角 - 生命和体力
    const topLeft = document.createElement('div');
    topLeft.className = 'hud-top-left';
    topLeft.innerHTML = `
      <div class="health-bar">
        <div class="health-fill" id="health-fill" style="width: 100%"></div>
      </div>
      <div class="stamina-bar">
        <div class="stamina-fill" id="stamina-fill" style="width: 100%"></div>
      </div>
    `;
    hudContainer.appendChild(topLeft);

    // 右上角 - 金钱
    const topRight = document.createElement('div');
    topRight.className = 'hud-top-right';
    topRight.innerHTML = `
      <div class="money-display" id="money-display">💰 500</div>
      <div style="font-size: 14px; color: #8b7355; margin-top: 5px;">
        按 <span class="key-hint">B</span> 打开仓库
      </div>
    `;
    hudContainer.appendChild(topRight);

    // 右下角 - 物品栏按钮
    const bottomRight = document.createElement('div');
    bottomRight.className = 'hud-bottom-right';
    bottomRight.innerHTML = `
      <button class="btn btn-small" id="btn-inventory">📦 仓库</button>
    `;
    hudContainer.appendChild(bottomRight);

    bottomRight.querySelector('#btn-inventory')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.WAREHOUSE);
    });

    // 准星
    const crosshair = document.createElement('div');
    crosshair.className = 'crosshair';
    hudContainer.appendChild(crosshair);

    this.uiLayer.appendChild(hudContainer);
    this.hudElements.set('hud-container', hudContainer);

    // 监听B键打开仓库
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'b' && this.gameState.getIsInGame()) {
        if (this.gameState.getGamePhase() === GamePhase.EXPLORATION) {
          this.showScreen('warehouse');
        } else if (this.gameState.getGamePhase() === GamePhase.WAREHOUSE) {
          this.showScreen('game-hud');
          this.gameState.setGamePhase(GamePhase.EXPLORATION);
        }
      }
    });
  }

  /**
   * 显示指定屏幕
   */
  showScreen(screenName) {
    for (const [name, screen] of this.screens) {
      screen.element.classList.add('hidden');
    }

    const hudContainer = this.hudElements.get('hud-container');
    if (hudContainer) hudContainer.classList.add('hidden');

    const targetScreen = this.screens.get(screenName);
    if (targetScreen) {
      targetScreen.element.classList.remove('hidden');
      targetScreen.onShow?.();
    }

    if (screenName === 'game-hud' && hudContainer) {
      hudContainer.classList.remove('hidden');
    }

    this.currentScreen = screenName;
  }

  /**
   * 更新HUD数据
   */
  updateHUD(data) {
    if (data.health !== undefined) {
      const healthFill = document.getElementById('health-fill');
      if (healthFill) {
        const maxHealth = 100;
        healthFill.style.width = `${Math.max(0, data.health / maxHealth * 100)}%`;
      }
    }

    if (data.money !== undefined) {
      const moneyDisplay = document.getElementById('money-display');
      if (moneyDisplay) {
        moneyDisplay.textContent = `💰 ${data.money}`;
      }
    }
  }
}

// === UI屏幕类 ===

class UIScreen {
  element;

  constructor() {
    this.element = document.createElement('div');
  }

  onShow() {}
}

/**
 * 主菜单
 */
class MainMenuScreen extends UIScreen {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.currentCharacter = '摸金校尉';
    this.characterIcons = {
      '摸金校尉': '🗡️',
      '发丘中郎': '🛡️',
      '搬山道人': '⚔️',
      '卸岭力士': '🔨',
    };
    this.render();
  }

  render() {
    this.element.innerHTML = `
      <div class="main-menu-container">
        <div class="menu-background"></div>
        
        <h1 class="game-title-small">摸金探险</h1>
        
        <div class="character-showcase">
          <div class="character-avatar" id="menu-character-avatar">
            <div class="character-icon" id="menu-character-icon">${this.characterIcons[this.currentCharacter]}</div>
            <div class="character-name-display" id="menu-character-name">${this.currentCharacter}</div>
            <span class="change-character" id="btn-change-character">更换角色</span>
          </div>
        </div>
        
        <div class="menu-buttons">
          <button class="menu-btn-large" id="btn-start-game">开始游戏</button>
          <div style="display: flex; gap: 20px; margin-top: 10px;">
            <button class="menu-btn-side" id="btn-warehouse">📦 仓库</button>
            <button class="menu-btn-side" id="btn-tutorial-menu">📖 教程</button>
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  setupEvents() {
    this.element.querySelector('#btn-start-game')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.EXPLORATION);
    });

    this.element.querySelector('#btn-warehouse')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.WAREHOUSE);
    });

    this.element.querySelector('#btn-tutorial-menu')?.addEventListener('click', () => {
      this.gameState.setGamePhase('TUTORIAL');
    });

    this.element.querySelector('#btn-change-character')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.PREPARATION);
    });

    // 点击角色头像也可以切换角色
    this.element.querySelector('#menu-character-avatar')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.PREPARATION);
    });
  }
}

/**
 * 新手教程
 */
class TutorialScreen extends UIScreen {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.element.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="font-size: 42px; color: #d4af37;">新手教程</h2>
        <p style="color: #8b7355;">3分钟快速上手摸金探险</p>
      </div>
      <div class="tutorial-content">
        <div class="tutorial-step">
          <h3>🎯 游戏目标</h3>
          <p>你是一名摸金校尉，进入古墓探索寻找宝物。你需要：</p>
          <ul style="margin-left: 20px; margin-top: 10px;">
            <li>在古墓中寻找发光的宝箱</li>
            <li>击败守护古墓的怪物</li>
            <li>找到绿色光圈撤离点成功撤离</li>
            <li>将宝物带回仓库出售换钱</li>
          </ul>
        </div>

        <div class="tutorial-step">
          <h3>⌨️ 操作说明</h3>
          <p>移动控制：</p>
          <div style="margin: 10px 0;">
            <span class="key-hint">↑</span> 前进
            <span class="key-hint">↓</span> 后退
            <span class="key-hint">←</span> 左移
            <span class="key-hint">→</span> 右移
          </div>
          <p>其他操作：</p>
          <div style="margin: 10px 0;">
            <span class="key-hint">Shift</span> 加速跑（消耗体力）
            <span class="key-hint">鼠标左键</span> 攻击怪物
            <span class="key-hint">B</span> 打开背包/仓库
          </div>
          <div class="tips-box">
            <h4>💡 提示</h4>
            <p>点击画面锁定鼠标控制视角。按 ESC 键解锁鼠标。</p>
          </div>
        </div>

        <div class="tutorial-step">
          <h3>👤 角色选择</h3>
          <p>每个角色都有独特的优势：</p>
          <ul style="margin-left: 20px; margin-top: 10px;">
            <li><strong>摸金校尉</strong> - 速度快，找宝箱效率高</li>
            <li><strong>发丘中郎</strong> - 防御高，武器伤害加成</li>
            <li><strong>搬山道人</strong> - 攻击力强，暴击率高</li>
            <li><strong>卸岭力士</strong> - 血厚负重高，能带更多宝物</li>
          </ul>
        </div>

        <div class="tutorial-step">
          <h3>📦 宝物与仓库</h3>
          <p>开宝箱获得宝物，不同宝物价值不同：</p>
          <ul style="margin-left: 20px; margin-top: 10px;">
            <li><span class="rarity-common">普通</span> - 古铜币等小东西</li>
            <li><span class="rarity-uncommon">精良</span> - 玉佩等</li>
            <li><span class="rarity-rare">稀有</span> - 金镯等</li>
            <li><span class="rarity-epic">史诗</span> - 翡翠项链等</li>
            <li><span class="rarity-legendary">传说</span> - 夜明珠等</li>
          </ul>
          <div class="tips-box">
            <h4>⚠️ 重要</h4>
            <p>成功撤离才能把宝物带回仓库！如果死亡，本局收集的所有宝物都会丢失！</p>
          </div>
        </div>

        <div class="tutorial-step">
          <h3>⚔️ 战斗系统</h3>
          <p>古墓中有三种怪物：</p>
          <ul style="margin-left: 20px; margin-top: 10px;">
            <li><span style="color: #ff3300;">🔥 火焰骷髅</span> - 红色发光，拿火焰剑</li>
            <li><span style="color: #00ff00;">☠️ 剧毒僵尸</span> - 绿色发光，会吐毒液</li>
            <li><span style="color: #ff00ff;">👻 暗影幽灵</span> - 紫色半透明，飘来飘去</li>
          </ul>
          <div class="tips-box">
            <h4>💡 战斗技巧</h4>
            <p>靠近怪物自动近战，远距离可以用远程攻击。优先击杀靠近的怪物！</p>
          </div>
        </div>

        <div class="tutorial-step">
          <h3>🏃 撤离机制</h3>
          <p>找到地图上的 <span style="color: #00ff88;">绿色光圈</span>（撤离点），走上去即可成功撤离。</p>
          <div class="tips-box">
            <h4>⚠️ 切记</h4>
            <p>不要贪心！血量低的时候及时撤离。活着才有输出，死了全归零！</p>
          </div>
        </div>

        <div class="tutorial-step">
          <h3>🏪 商店系统</h3>
          <p>在仓库界面点击"前往商店"可以购买装备：</p>
          <ul style="margin-left: 20px; margin-top: 10px;">
            <li>武器 - 提升攻击力</li>
            <li>医疗包 - 恢复生命值</li>
            <li>护甲 - 提升防御力</li>
            <li>背包 - 增加负重上限</li>
          </ul>
        </div>
      </div>
      <button class="btn" id="btn-tutorial-back" style="margin-top: 20px;">返回主菜单</button>
      <button class="btn" id="btn-tutorial-start" style="margin-top: 10px;">开始游戏</button>
    `;

    this.element.querySelector('#btn-tutorial-back')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.MENU);
    });

    this.element.querySelector('#btn-tutorial-start')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.EXPLORATION);
    });
  }
}

/**
 * 角色选择
 */
class PreparationScreen extends UIScreen {
  selectedCharacter = null;

  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.element.innerHTML = `
      <h2 style="font-size: 36px; margin-bottom: 30px;">选择你的角色</h2>
      <div id="character-container">
        ${this.createCharacterCard(CharacterType.MOJIN_XIAOWEI, '摸金校尉', '速度快，宝箱感知强', { speed: 90, defense: 40, attack: 50, health: 60 })}
        ${this.createCharacterCard(CharacterType.FAQUIU_ZHONGLANG, '发丘中郎', '防御高，武器加成', { speed: 50, defense: 90, attack: 70, health: 80 })}
        ${this.createCharacterCard(CharacterType.BANSHAN_DAOREN, '搬山道人', '对怪物伤害高，暴击率高', { speed: 60, defense: 30, attack: 95, health: 40 })}
        ${this.createCharacterCard(CharacterType.XIELING_LISHI, '卸岭力士', '负重高，血厚', { speed: 30, defense: 70, attack: 60, health: 95 })}
      </div>
      <div style="margin-top: 30px;">
        <button class="btn" id="btn-enter" style="opacity: 0.5;" disabled>进入古墓</button>
        <button class="btn" id="btn-tutorial-from-prep">查看教程</button>
      </div>
    `;

    this.setupCharacterSelection();

    this.element.querySelector('#btn-tutorial-from-prep')?.addEventListener('click', () => {
      this.gameState.setGamePhase('TUTORIAL');
    });
  }

  createCharacterCard(type, name, description, stats) {
    return `
      <div class="character-card" data-character="${type}">
        <h3 style="font-size: 24px; margin-bottom: 10px;">${name}</h3>
        <p style="color: #8b7355; margin-bottom: 20px; font-size: 14px;">${description}</p>
        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
            <span>速度</span><div class="stat-bar"><div class="stat-bar-fill" style="width: ${stats.speed}%"></div></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
            <span>防御</span><div class="stat-bar"><div class="stat-bar-fill" style="width: ${stats.defense}%"></div></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
            <span>攻击</span><div class="stat-bar"><div class="stat-bar-fill" style="width: ${stats.attack}%"></div></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0;">
            <span>血量</span><div class="stat-bar"><div class="stat-bar-fill" style="width: ${stats.health}%"></div></div>
          </div>
        </div>
      </div>
    `;
  }

  setupCharacterSelection() {
    const cards = this.element.querySelectorAll('.character-card');
    const enterBtn = this.element.querySelector('#btn-enter');

    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedCharacter = card.getAttribute('data-character');

        enterBtn.disabled = false;
        enterBtn.style.opacity = '1';
      });
    });

    enterBtn.addEventListener('click', () => {
      if (this.selectedCharacter) {
        this.gameState.selectCharacter(this.selectedCharacter);
        this.gameState.setGamePhase(GamePhase.EXPLORATION);
      }
    });
  }
}

/**
 * 死亡屏幕
 */
class DeathScreen extends UIScreen {
  constructor() {
    super();
    this.element.innerHTML = `
      <h1 class="message-text">你死了</h1>
      <p style="font-size: 20px; color: #8b7355; margin-top: 20px;">所有装备和宝物已丢失...</p>
      <div class="tips-box" style="margin-top: 30px; max-width: 400px;">
        <h4>💡 小贴士</h4>
        <p>下次记得及时撤离！血量低的时候不要贪心。</p>
      </div>
      <p style="font-size: 16px; color: #555; margin-top: 30px;">3秒后自动返回主菜单</p>
    `;
  }
}

/**
 * 撤离成功
 */
class EvacuationSuccessScreen extends UIScreen {
  constructor() {
    super();
    this.element.innerHTML = `
      <h1 class="success-text">撤离成功！</h1>
      <p style="font-size: 20px; color: #d4af37; margin-top: 20px;">所有宝物已存入仓库</p>
      <div class="tips-box" style="margin-top: 20px; max-width: 400px;">
        <h4>🎉 恭喜</h4>
        <p>你可以去仓库查看获得的宝物并出售换钱！</p>
      </div>
      <p style="font-size: 16px; color: #555; margin-top: 20px;">3秒后进入仓库</p>
    `;
  }
}

/**
 * 仓库界面
 */
class WarehouseScreen extends UIScreen {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.currentTab = 'warehouse';
    this.selectedItemIndex = -1;
    
    this.element.innerHTML = `
      <div style="width: 90%; max-width: 1000px;">
        <h2 style="font-size: 36px; margin-bottom: 10px;">📦 仓库</h2>
        <div class="money-display" id="warehouse-money" style="margin-bottom: 20px;">💰 500</div>
        
        <div class="warehouse-tabs">
          <button class="warehouse-tab active" data-tab="warehouse">🏛️ 总仓库</button>
          <button class="warehouse-tab" data-tab="session">🎒 本局物品</button>
          <button class="warehouse-tab" data-tab="shop">🏪 商店</button>
        </div>

        <div id="warehouse-content" style="min-height: 300px;">
          <div id="items-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h3 id="items-title">我的宝物</h3>
              <div id="item-count" style="color: #8b7355;">共 0 件</div>
            </div>
            <div class="inventory-grid" id="warehouse-items"></div>
          </div>
          
          <div id="selected-item-info" style="margin-top: 20px; padding: 15px; border: 1px solid #5c4a2a; background: rgba(0,0,0,0.4); display: none;">
            <h4 id="selected-name" style="color: #f1c40f; margin-bottom: 10px;"></h4>
            <p id="selected-desc" style="color: #8b7355; margin-bottom: 10px;"></p>
            <div style="display: flex; gap: 20px;">
              <span>💰 价值: <span class="item-value" id="selected-value"></span></span>
              <span>⚖️ 重量: <span id="selected-weight"></span>kg</span>
              <span id="selected-rarity"></span>
            </div>
          </div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn btn-small" id="btn-sell" style="display: none;">💰 出售选中</button>
          <button class="btn btn-small" id="btn-sell-all" style="display: none;">💰 全部出售</button>
          <button class="btn" id="btn-back-to-game">返回游戏</button>
        </div>
      </div>
    `;

    this.setupTabs();
    this.setupButtons();
    this.updateDisplay();

    this.gameState.on('warehouseChanged', () => {
      if (this.currentTab === 'warehouse') this.updateDisplay();
    });
    this.gameState.on('sessionItemsChanged', () => {
      if (this.currentTab === 'session') this.updateDisplay();
    });
    this.gameState.on('moneyChanged', () => this.updateMoney());
  }

  setupTabs() {
    const tabs = this.element.querySelectorAll('.warehouse-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.getAttribute('data-tab');
        
        if (this.currentTab === 'shop') {
          this.gameState.setGamePhase(GamePhase.SHOP);
          return;
        }
        
        this.updateDisplay();
      });
    });
  }

  updateDisplay() {
    const container = this.element.querySelector('#warehouse-items');
    const title = this.element.querySelector('#items-title');
    const count = this.element.querySelector('#item-count');
    const sellBtn = this.element.querySelector('#btn-sell');
    const sellAllBtn = this.element.querySelector('#btn-sell-all');
    const infoPanel = this.element.querySelector('#selected-item-info');

    let items = [];
    if (this.currentTab === 'warehouse') {
      items = this.gameState.getWarehouse();
      title.textContent = '🏛️ 仓库宝物';
      sellBtn.style.display = 'inline-block';
      sellAllBtn.style.display = items.length > 0 ? 'inline-block' : 'none';
    } else {
      items = this.gameState.getSessionItems();
      title.textContent = '🎒 本局收集（未撤离前不可出售）';
      sellBtn.style.display = 'none';
      sellAllBtn.style.display = 'none';
    }

    count.textContent = `共 ${items.length} 件`;
    infoPanel.style.display = 'none';
    this.selectedItemIndex = -1;

    if (items.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: #666; padding: 40px;">
          ${this.currentTab === 'warehouse' ? '📭 仓库空空如也，快去古墓探险吧！' : '📭 本局还未收集到宝物'}
        </div>
      `;
      return;
    }

    container.innerHTML = items.map((item, index) => {
      const rarityColors = {
        '普通': '#95a5a6',
        '精良': '#2ecc71',
        '稀有': '#3498db',
        '史诗': '#9b59b6',
        '传说': '#e67e22'
      };
      const rarityColor = rarityColors[item.rarity] || '#fff';
      
      return `
        <div class="inventory-slot" data-index="${index}" style="border-color: ${rarityColor};">
          <div style="text-align: center;">
            <div class="item-name" style="color: ${rarityColor};">${item.name}</div>
            <div style="font-size: 10px; color: #666; margin-top: 5px;">
              💰${item.value} ⚖️${item.weight}kg
            </div>
            <div style="font-size: 9px; color: ${rarityColor}; margin-top: 3px;">${item.rarity}</div>
          </div>
        </div>
      `;
    }).join('');

    // 选中效果
    container.querySelectorAll('.inventory-slot').forEach((slot) => {
      slot.addEventListener('click', () => {
        container.querySelectorAll('.inventory-slot').forEach((s) => s.classList.remove('selected'));
        slot.classList.add('selected');
        this.selectedItemIndex = parseInt(slot.getAttribute('data-index'));
        this.showItemInfo(items[this.selectedItemIndex]);
        sellBtn.style.display = this.currentTab === 'warehouse' ? 'inline-block' : 'none';
      });
    });
  }

  showItemInfo(item) {
    const infoPanel = this.element.querySelector('#selected-item-info');
    infoPanel.style.display = 'block';
    
    const rarityColors = {
      '普通': '#95a5a6',
      '精良': '#2ecc71',
      '稀有': '#3498db',
      '史诗': '#9b59b6',
      '传说': '#e67e22'
    };

    this.element.querySelector('#selected-name').textContent = item.name;
    this.element.querySelector('#selected-desc').textContent = item.description;
    this.element.querySelector('#selected-value').textContent = item.value;
    this.element.querySelector('#selected-weight').textContent = item.weight;
    const rarityEl = this.element.querySelector('#selected-rarity');
    rarityEl.textContent = item.rarity;
    rarityEl.style.color = rarityColors[item.rarity] || '#fff';
  }

  updateMoney() {
    const moneyDisplay = this.element.querySelector('#warehouse-money');
    if (moneyDisplay) {
      moneyDisplay.textContent = `💰 ${this.gameState.getMoney()}`;
    }
  }

  setupButtons() {
    // 出售单个
    this.element.querySelector('#btn-sell')?.addEventListener('click', () => {
      if (this.selectedItemIndex >= 0 && this.currentTab === 'warehouse') {
        const items = this.gameState.getWarehouse();
        if (this.selectedItemIndex < items.length) {
          const item = items[this.selectedItemIndex];
          const confirmSell = confirm(`确定要出售 ${item.name} 吗？\n可以获得 💰${item.value} 金币`);
          if (confirmSell) {
            this.gameState.sellItemFromWarehouse(this.selectedItemIndex);
            this.selectedItemIndex = -1;
            this.updateDisplay();
          }
        }
      }
    });

    // 出售全部
    this.element.querySelector('#btn-sell-all')?.addEventListener('click', () => {
      const items = this.gameState.getWarehouse();
      if (items.length === 0) return;
      
      const totalValue = items.reduce((sum, item) => sum + item.value, 0);
      const confirmSell = confirm(`确定要出售仓库中全部 ${items.length} 件宝物吗？\n总计可以获得 💰${totalValue} 金币`);
      
      if (confirmSell) {
        // 从后往前删除，避免索引错乱
        for (let i = items.length - 1; i >= 0; i--) {
          this.gameState.sellItemFromWarehouse(i);
        }
        this.selectedItemIndex = -1;
        this.updateDisplay();
      }
    });

    // 返回游戏
    this.element.querySelector('#btn-back-to-game')?.addEventListener('click', () => {
      if (this.gameState.getIsInGame()) {
        this.gameState.setGamePhase(GamePhase.EXPLORATION);
      } else {
        this.gameState.setGamePhase(GamePhase.MENU);
      }
    });
  }

  onShow() {
    this.updateDisplay();
    this.updateMoney();
  }
}

/**
 * 商店界面
 */
class ShopScreen extends UIScreen {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.element.innerHTML = `
      <div style="width: 90%; max-width: 900px;">
        <h2 style="font-size: 36px; margin-bottom: 10px;">🏪 装备商店</h2>
        <div class="money-display" id="shop-money" style="margin-bottom: 20px;">💰 500</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0;">
          ${this.createWeaponCard('匕首', '基础近战武器', 100, 15, '近战', '⚔️')}
          ${this.createWeaponCard('短剑', '进阶近战武器', 300, 30, '近战', '⚔️')}
          ${this.createWeaponCard('铁锤', '重型近战武器', 250, 35, '近战', '🔨')}
          ${this.createWeaponCard('手枪', '基础远程武器', 500, 20, '远程', '🔫')}
          ${this.createWeaponCard('步枪', '进阶远程武器', 1500, 40, '远程', '🔫')}
          ${this.createWeaponCard('医疗包', '恢复50点生命', 200, 0, '辅助', '🏥')}
          ${this.createWeaponCard('护甲', '提升防御力', 400, 0, '辅助', '🛡️')}
          ${this.createWeaponCard('背包', '增加负重上限', 300, 0, '辅助', '🎒')}
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn" id="btn-back-warehouse">返回仓库</button>
          <button class="btn" id="btn-back-game">返回游戏</button>
        </div>
      </div>
    `;

    this.setupPurchaseButtons();
    this.gameState.on('moneyChanged', () => this.updateMoney());

    this.element.querySelector('#btn-back-warehouse')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.WAREHOUSE);
    });

    this.element.querySelector('#btn-back-game')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.EXPLORATION);
    });
  }

  createWeaponCard(name, desc, price, damage, type, icon) {
    return `
      <div style="border: 2px solid #5c4a2a; padding: 20px; background: rgba(0,0,0,0.6); text-align: center; transition: all 0.3s;" 
           onmouseover="this.style.borderColor='#d4af37'" onmouseout="this.style.borderColor='#5c4a2a'">
        <div style="font-size: 36px; margin-bottom: 10px;">${icon}</div>
        <h3 style="font-size: 20px; margin-bottom: 8px; color: #d4af37;">${name}</h3>
        <p style="font-size: 13px; color: #8b7355; margin-bottom: 10px;">${desc}</p>
        <p style="font-size: 16px; color: #e74c3c; margin-bottom: 5px;">💰 ${price}</p>
        ${damage > 0 ? `<p style="font-size: 13px; color: #e67e22;">⚔️ 伤害: ${damage}</p>` : ''}
        <p style="font-size: 12px; color: #666; margin-top: 5px;">类型: ${type}</p>
        <button class="btn buy-btn btn-small" style="margin-top: 15px;" 
                data-name="${name}" data-price="${price}" data-damage="${damage}" data-type="${type}">
          购买
        </button>
      </div>
    `;
  }

  setupPurchaseButtons() {
    const buyButtons = this.element.querySelectorAll('.buy-btn');
    buyButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const price = parseInt(btn.getAttribute('data-price') || '0');
        const name = btn.getAttribute('data-name') || '';
        const damage = parseInt(btn.getAttribute('data-damage') || '0');
        const type = btn.getAttribute('data-type') || '';

        if (type === '辅助') {
          if (this.gameState.spendMoney(price)) {
            if (name === '医疗包') {
              this.gameState.heal(50);
              alert(`✅ 使用了医疗包！生命值恢复50点`);
            } else if (name === '护甲') {
              this.gameState.currentArmor = 10;
              alert(`✅ 购买了护甲！防御力提升`);
            } else if (name === '背包') {
              this.gameState.maxWeight += 20;
              alert(`✅ 购买了背包！负重上限+20kg`);
            }
          } else {
            alert('❌ 金钱不足！快去古墓探险吧');
          }
        } else if (this.gameState.spendMoney(price)) {
          const weapon = {
            id: `weapon_${Date.now()}`,
            name,
            damage,
            range: type === '远程' ? 20 : 3,
            attackSpeed: type === '远程' ? 0.5 : 1,
            value: Math.floor(price * 0.5),
            weight: 2,
            type: type === '远程' ? WeaponType.RANGED : WeaponType.MELEE,
          };
          this.gameState.equipWeapon(weapon);
          alert(`✅ 购买成功！已装备 ${name}\n⚔️ 攻击力 +${damage}`);
        } else {
          alert('❌ 金钱不足！快去古墓探险吧');
        }
      });
    });
  }

  updateMoney() {
    const moneyDisplay = this.element.querySelector('#shop-money');
    if (moneyDisplay) {
      moneyDisplay.textContent = `💰 ${this.gameState.getMoney()}`;
    }
  }
}
