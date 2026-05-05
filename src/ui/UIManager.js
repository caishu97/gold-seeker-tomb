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
      .hud-bottom-center {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
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
    `;
    document.head.appendChild(style);
  }

  /**
   * 设置所有UI屏幕
   */
  setupScreens() {
    this.screens.set('main-menu', new MainMenuScreen(this.gameState));
    this.screens.set('preparation', new PreparationScreen(this.gameState));
    this.screens.set('death-screen', new DeathScreen());
    this.screens.set('evacuation-success', new EvacuationSuccessScreen());
    this.screens.set('warehouse', new WarehouseScreen(this.gameState));
    this.screens.set('shop', new ShopScreen(this.gameState));

    // 添加到DOM
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
    this.hudElements.set('health', document.getElementById('health-fill'));
    this.hudElements.set('stamina', document.getElementById('stamina-fill'));

    // 右上角 - 金钱
    const topRight = document.createElement('div');
    topRight.className = 'hud-top-right';
    topRight.innerHTML = `
      <div class="money-display" id="money-display">💰 500</div>
    `;
    hudContainer.appendChild(topRight);

    // 准星
    const crosshair = document.createElement('div');
    crosshair.className = 'crosshair';
    hudContainer.appendChild(crosshair);

    this.uiLayer.appendChild(hudContainer);
    this.hudElements.set('hud-container', hudContainer);
    this.hudElements.set('money', topRight.querySelector('#money-display'));
  }

  /**
   * 显示指定屏幕
   */
  showScreen(screenName) {
    // 隐藏所有屏幕
    for (const [name, screen] of this.screens) {
      screen.element.classList.add('hidden');
    }

    // 隐藏HUD
    const hudContainer = this.hudElements.get('hud-container');
    if (hudContainer) hudContainer.classList.add('hidden');

    // 显示目标屏幕
    const targetScreen = this.screens.get(screenName);
    if (targetScreen) {
      targetScreen.element.classList.remove('hidden');
      targetScreen.onShow?.();
    }

    // 如果是游戏HUD
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
        const maxHealth = 100; // 应该从GameState获取
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

/**
 * 基础UI屏幕类
 */
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
    this.element.innerHTML = `
      <h1 class="game-title">摸金探险</h1>
      <p class="game-subtitle">深入古墓，寻找传说中的宝藏</p>
      <button class="btn" id="btn-start">开始游戏</button>
      <button class="btn" id="btn-tutorial">游戏教程</button>
    `;

    this.element.querySelector('#btn-start')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.PREPARATION);
    });
  }
}

/**
 * 准备阶段 - 角色选择
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
        ${this.createCharacterCard(CharacterType.BANSHAN_DAOREN, '搬山道人', '伤害高，暴击率高', { speed: 60, defense: 30, attack: 95, health: 40 })}
        ${this.createCharacterCard(CharacterType.XIELING_LISHI, '卸岭力士', '负重高，血量厚', { speed: 30, defense: 70, attack: 60, health: 95 })}
      </div>
      <button class="btn" id="btn-enter" style="margin-top: 40px; opacity: 0.5;" disabled>进入古墓</button>
    `;

    this.setupCharacterSelection();
  }

  createCharacterCard(
    type,
    name,
    description,
    stats
  ) {
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
      <p style="font-size: 20px; color: #8b7355; margin-top: 20px;">所有装备已丢失...</p>
      <p style="font-size: 16px; color: #555; margin-top: 30px;">3秒后自动返回主菜单</p>
    `;
  }
}

/**
 * 撤离成功屏幕
 */
class EvacuationSuccessScreen extends UIScreen {
  constructor() {
    super();
    this.element.innerHTML = `
      <h1 style="font-size: 48px; color: #2ecc71; text-shadow: 0 0 20px rgba(46, 204, 113, 0.5);">撤离成功！</h1>
      <p style="font-size: 20px; color: #d4af37; margin-top: 30px;">所有宝物已存入仓库</p>
      <p style="font-size: 16px; color: #555; margin-top: 30px;">3秒后进入仓库</p>
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
    this.element.innerHTML = `
      <h2 style="font-size: 36px; margin-bottom: 20px;">仓库</h2>
      <div class="money-display" id="warehouse-money" style="margin-bottom: 30px;">💰 500</div>
      <div style="display: flex; gap: 40px;">
        <div>
          <h3 style="margin-bottom: 15px;">我的宝物</h3>
          <div class="inventory-grid" id="warehouse-items"></div>
        </div>
      </div>
      <div style="margin-top: 30px;">
        <button class="btn" id="btn-sell">出售选中</button>
        <button class="btn" id="btn-to-shop">前往商店</button>
        <button class="btn" id="btn-next-mission">下一段探险</button>
      </div>
    `;

    this.updateItems();
    this.setupButtons();

    this.gameState.on('warehouseChanged', () => this.updateItems());
    this.gameState.on('moneyChanged', () => this.updateMoney());
  }

  updateItems() {
    const container = this.element.querySelector('#warehouse-items');
    if (!container) return;

    const items = this.gameState.getWarehouse();
    container.innerHTML = items.map((item, index) => `
      <div class="inventory-slot" data-index="${index}">
        <div>
          <div class="item-name">${item.name}</div>
          <div style="font-size: 10px; color: #666;">💰${item.value} ⚖️${item.weight}kg</div>
        </div>
      </div>
    `).join('');

    // 选中效果
    container.querySelectorAll('.inventory-slot').forEach((slot) => {
      slot.addEventListener('click', function() {
        container.querySelectorAll('.inventory-slot').forEach((s) => (s).style.borderColor = '#5c4a2a');
        (this).style.borderColor = '#d4af37';
        (this).dataset.selected = 'true';
      });
    });
  }

  updateMoney() {
    const moneyDisplay = this.element.querySelector('#warehouse-money');
    if (moneyDisplay) {
      moneyDisplay.textContent = `💰 ${this.gameState.getMoney()}`;
    }
  }

  setupButtons() {
    this.element.querySelector('#btn-sell')?.addEventListener('click', () => {
      const selected = this.element.querySelector('[data-selected="true"]');
      if (selected) {
        const index = parseInt(selected.getAttribute('data-index') || '0');
        this.gameState.sellItemFromWarehouse(index);
      }
    });

    this.element.querySelector('#btn-to-shop')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.SHOP);
    });

    this.element.querySelector('#btn-next-mission')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.PREPARATION);
    });
  }

  onShow() {
    this.updateItems();
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
      <h2 style="font-size: 36px; margin-bottom: 20px;">装备商店</h2>
      <div class="money-display" id="shop-money" style="margin-bottom: 30px;">💰 500</div>
      <div style="display: grid; grid-template-columns: repeat(3, 200px); gap: 20px; margin: 20px;">
        ${this.createWeaponCard('匕首', '基础近战武器', 100, 15, '近战')}
        ${this.createWeaponCard('短剑', '进阶近战武器', 300, 30, '近战')}
        ${this.createWeaponCard('铁锤', '重型近战武器', 250, 35, '近战')}
        ${this.createWeaponCard('手枪', '基础远程武器', 500, 20, '远程')}
        ${this.createWeaponCard('步枪', '进阶远程武器', 1500, 40, '远程')}
        ${this.createWeaponCard('医疗包', '恢复50点生命', 200, 0, '辅助')}
        ${this.createWeaponCard('护甲', '提升防御力', 400, 0, '辅助')}
        ${this.createWeaponCard('背包', '增加负重上限', 300, 0, '辅助')}
      </div>
      <button class="btn" id="btn-back" style="margin-top: 20px;">返回仓库</button>
    `;

    this.setupPurchaseButtons();
    this.gameState.on('moneyChanged', () => this.updateMoney());

    this.element.querySelector('#btn-back')?.addEventListener('click', () => {
      this.gameState.setGamePhase(GamePhase.WAREHOUSE);
    });
  }

  createWeaponCard(name, desc, price, damage, type) {
    return `
      <div style="border: 2px solid #5c4a2a; padding: 15px; background: rgba(0,0,0,0.6); text-align: center;">
        <h3 style="font-size: 18px; margin-bottom: 8px;">${name}</h3>
        <p style="font-size: 12px; color: #8b7355; margin-bottom: 10px;">${desc}</p>
        <p style="font-size: 14px; color: #e74c3c;">💰 ${price}</p>
        ${damage > 0 ? `<p style="font-size: 12px; color: #e67e22;">⚔️ 伤害: ${damage}</p>` : ''}
        <button class="btn buy-btn" style="margin-top: 10px; padding: 8px 30px; font-size: 14px;" 
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
            }
            alert(`购买成功！`);
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
          alert(`购买成功！已装备 ${name}`);
        } else {
          alert('金钱不足！');
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
