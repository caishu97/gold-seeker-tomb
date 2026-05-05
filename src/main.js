import * as THREE from 'three';
import { GameEngine } from './core/GameEngine.js';
import { DungeonMap } from './map/DungeonMap.js';
import { GameState, GamePhase } from './game/GameState.js';
import { UIManager } from './ui/UIManager.js';

/**
 * 游戏入口
 */
class Game {
  engine;
  uiManager;
  gameState;

  constructor() {
    const container = document.getElementById('game-container');
    if (!container) {
      throw new Error('找不到游戏容器元素');
    }

    this.gameState = GameState.getInstance();
    this.engine = new GameEngine(container);
    this.uiManager = new UIManager(this.gameState);

    // 设置UI事件监听
    this.setupUIEvents();

    // 检查是否是首次进入
    const hasVisited = localStorage.getItem('goldSeekerVisited');
    if (!hasVisited) {
      // 首次进入，显示教程
      localStorage.setItem('goldSeekerVisited', 'true');
      this.uiManager.showScreen('tutorial');
    } else {
      this.uiManager.showScreen('main-menu');
    }
  }

  /**
   * 设置UI事件
   */
  setupUIEvents() {
    // 监听游戏阶段变化
    this.gameState.on('phaseChanged', (phase) => {
      switch (phase) {
        case GamePhase.MENU:
          this.uiManager.showScreen('main-menu');
          break;
        case 'TUTORIAL':
          this.uiManager.showScreen('tutorial');
          break;
        case GamePhase.PREPARATION:
          this.uiManager.showScreen('preparation');
          break;
        case GamePhase.EXPLORATION:
          this.startExploration();
          break;
        case GamePhase.WAREHOUSE:
          this.uiManager.showScreen('warehouse');
          break;
        case GamePhase.SHOP:
          this.uiManager.showScreen('shop');
          break;
      }
    });

    // 监听血量变化
    this.gameState.on('healthChanged', (health) => {
      this.uiManager.updateHUD({ health });
    });

    // 监听金钱变化
    this.gameState.on('moneyChanged', (money) => {
      this.uiManager.updateHUD({ money });
    });

    // 监听玩家死亡
    this.gameState.on('playerDied', () => {
      this.handlePlayerDeath();
    });

    // 监听撤离成功
    this.gameState.on('evacuationSuccess', () => {
      this.handleEvacuationSuccess();
    });
  }

  /**
   * 开始探索阶段
   */
  startExploration(seed) {
    // 生成新地图
    const dungeonMap = new DungeonMap(seed);
    this.engine.loadMap(dungeonMap);

    // 注册玩家到游戏状态
    const player = this.engine.getPlayer();
    if (player) {
      this.gameState.setPlayer(player);
    }

    // 开始游戏循环
    this.engine.start();

    // 显示游戏HUD
    this.uiManager.showScreen('game-hud');
    this.gameState.setInGame(true);

    console.log(' exploration started! Find the evacuation zone...');
  }

  /**
   * 处理玩家死亡
   */
  handlePlayerDeath() {
    this.engine.stop();
    this.uiManager.showScreen('death-screen');
    
    // 3秒后返回主菜单
    setTimeout(() => {
      this.gameState.setGamePhase(GamePhase.MENU);
      this.gameState.resetForNewGame();
    }, 3000);
  }

  /**
   * 处理成功撤离
   */
  handleEvacuationSuccess() {
    this.engine.stop();
    this.uiManager.showScreen('evacuation-success');

    // 3秒后进入仓库
    setTimeout(() => {
      this.gameState.setGamePhase(GamePhase.WAREHOUSE);
    }, 3000);
  }

  /**
   * 检查撤离条件
   */
  checkEvacuation() {
    const map = this.engine.getCurrentMap();
    const player = this.engine.getPlayer();
    
    if (map && player && map.canEvacuate(player.getPosition())) {
      this.gameState.setGamePhase(GamePhase.EVACUATION);
    }
  }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
  try {
    new Game();
    console.log('游戏初始化完成！');
  } catch (error) {
    console.error('游戏初始化失败:', error);
  }
});
