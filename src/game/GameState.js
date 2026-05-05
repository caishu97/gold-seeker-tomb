import * as THREE from 'three';

/**
 * 游戏状态管理
 * 使用单例模式，全局唯一数据源
 */
export class GameState {
  static instance;

  // 核心游戏数据
  money = 500; // 初始金钱
  warehouse = []; // 仓库物品
  equippedWeapons = []; // 装备中的武器
  currentHealth = 100;
  maxHealth = 100;
  currentArmor = 0;
  currentWeight = 0;
  maxWeight = 50;
  currentLevel = 1;

  // 本局游戏数据
  sessionItems = []; // 本局收集的物品
  sessionWeapons = []; // 本局获得的武器
  hasSeenTutorial = false; // 是否看过教程
  selectedCharacter = null;

  // 游戏进行状态
  isInGame = false;
  gamePhase = GamePhase.MENU;

  // 事件监听
  listeners = new Map();

  player = null;

  constructor() {}

  static getInstance() {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  // 本局物品管理
  addSessionItem(item) {
    this.sessionItems.push(item);
    this.emit('sessionItemsChanged', this.sessionItems);
  }

  getSessionItems() {
    return [...this.sessionItems];
  }

  clearSessionItems() {
    this.sessionItems = [];
    this.emit('sessionItemsChanged', this.sessionItems);
  }

  // === 角色选择 ===
  selectCharacter(charType) {
    this.selectedCharacter = charType;
    this.applyCharacterStats(charType);
    this.emit('characterSelected', charType);
  }

  getSelectedCharacter() {
    return this.selectedCharacter;
  }

  applyCharacterStats(charType) {
    switch (charType) {
      case CharacterType.MOJIN_XIAOWEI:
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.maxWeight = 45;
        break;
      case CharacterType.FAQUIU_ZHONGLANG:
        this.maxHealth = 130;
        this.currentHealth = 130;
        this.maxWeight = 50;
        break;
      case CharacterType.BANSHAN_DAOREN:
        this.maxHealth = 90;
        this.currentHealth = 90;
        this.maxWeight = 40;
        break;
      case CharacterType.XIELING_LISHI:
        this.maxHealth = 150;
        this.currentHealth = 150;
        this.maxWeight = 70;
        break;
    }
    this.emit('statsChanged', this.getStats());
  }

  // === 经济系统 ===
  getMoney() {
    return this.money;
  }

  addMoney(amount) {
    this.money += amount;
    this.emit('moneyChanged', this.money);
  }

  spendMoney(amount) {
    if (this.money >= amount) {
      this.money -= amount;
      this.emit('moneyChanged', this.money);
      return true;
    }
    return false;
  }

  // === 仓库系统 ===
  addToWarehouse(item) {
    this.warehouse.push(item);
    this.emit('warehouseChanged', this.warehouse);
  }

  removeFromWarehouse(index) {
    if (index >= 0 && index < this.warehouse.length) {
      const item = this.warehouse.splice(index, 1)[0];
      this.emit('warehouseChanged', this.warehouse);
      return item;
    }
    return null;
  }

  getWarehouse() {
    return [...this.warehouse];
  }

  sellItemFromWarehouse(index) {
    const item = this.removeFromWarehouse(index);
    if (item) {
      this.addMoney(item.value);
      this.emit('itemSold', item);
      return true;
    }
    return false;
  }

  // === 装备系统 ===
  equipWeapon(weapon) {
    if (this.equippedWeapons.length < 2) {
      this.equippedWeapons.push(weapon);
      this.emit('weaponsChanged', this.equippedWeapons);
      return true;
    }
    return false;
  }

  unequipWeapon(index) {
    if (index >= 0 && index < this.equippedWeapons.length) {
      const weapon = this.equippedWeapons.splice(index, 1)[0];
      this.emit('weaponsChanged', this.equippedWeapons);
      return weapon;
    }
    return null;
  }

  getEquippedWeapons() {
    return [...this.equippedWeapons];
  }

  // === 状态管理 ===
  getStats() {
    return {
      health: this.currentHealth,
      maxHealth: this.maxHealth,
      armor: this.currentArmor,
      weight: this.currentWeight,
      maxWeight: this.maxWeight,
      money: this.money,
      level: this.currentLevel,
    };
  }

  takeDamage(damage) {
    const actualDamage = Math.max(1, damage - this.currentArmor);
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
    this.emit('healthChanged', this.currentHealth);
    if (this.currentHealth <= 0) {
      this.emit('playerDied', null);
    }
  }

  heal(amount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.emit('healthChanged', this.currentHealth);
  }

  addWeight(weight) {
    if (this.currentWeight + weight <= this.maxWeight) {
      this.currentWeight += weight;
      this.emit('weightChanged', this.currentWeight);
      return true;
    }
    return false;
  }

  removeWeight(weight) {
    this.currentWeight = Math.max(0, this.currentWeight - weight);
    this.emit('weightChanged', this.currentWeight);
  }

  // === 游戏阶段 ===
  setGamePhase(phase) {
    this.gamePhase = phase;
    this.emit('phaseChanged', phase);
  }

  getGamePhase() {
    return this.gamePhase;
  }

  setInGame(inGame) {
    this.isInGame = inGame;
    this.emit('gameStateChanged', inGame);
  }

  getIsInGame() {
    return this.isInGame;
  }

  setPlayer(player) {
    this.player = player;
  }

  getPlayer() {
    return this.player;
  }

  // === 事件系统 ===
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index >= 0) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  /**
   * 成功撤离 - 将局内物品转移到仓库
   */
  evacuate() {
    const items = [...this.sessionItems];
    items.forEach((item) => this.warehouse.push(item));
    this.sessionItems = [];
    this.emit('evacuationSuccess', { items, weapons: this.sessionWeapons });
    this.emit('warehouseChanged', this.warehouse);
  }

  /**
   * 死亡 - 丢失局内所有装备和物品
   */
  onDeath() {
    this.sessionItems = [];
    this.sessionWeapons = [];
    this.equippedWeapons = [];
    this.currentHealth = this.maxHealth;
    this.currentWeight = 0;
    this.emit('playerDied', null);
  }

  /**
   * 重置本局状态（进入新古墓前）
   */
  resetForNewGame() {
    this.currentHealth = this.maxHealth;
    this.currentWeight = 0;
    this.currentArmor = 0;
    this.sessionItems = [];
    this.sessionWeapons = [];
    this.gamePhase = GamePhase.PREPARATION;
    this.emit('statsChanged', this.getStats());
  }
}

// === 类型定义 ===

export const CharacterType = {
  MOJIN_XIAOWEI: '摸金校尉',
  FAQUIU_ZHONGLANG: '发丘中郎',
  BANSHAN_DAOREN: '搬山道人',
  XIELING_LISHI: '卸岭力士',
};

export const GamePhase = {
  MENU: 'MENU',
  PREPARATION: 'PREPARATION',
  EXPLORATION: 'EXPLORATION',
  EVACUATION: 'EVACUATION',
  WAREHOUSE: 'WAREHOUSE',
  SHOP: 'SHOP',
};

export const ItemRarity = {
  COMMON: '普通',
  UNCOMMON: '精良',
  RARE: '稀有',
  EPIC: '史诗',
  LEGENDARY: '传说',
};

export const WeaponType = {
  MELEE: '近战',
  RANGED: '远程',
  THROWABLE: '投掷',
};
