import * as THREE from 'three';
import { GameState } from '../game/GameState.js';
import { DungeonMap } from '../map/DungeonMap.js';
import { Player } from '../entities/Player.js';
import { CombatSystem } from '../systems/CombatSystem.js';

/**
 * 游戏引擎主类
 * 管理场景、相机、渲染器、游戏循环
 */
export class GameEngine {
  container;
  renderer;
  scene;
  camera;
  clock;
  isRunning = false;

  // 游戏模块
  gameState;
  currentMap = null;
  player = null;
  combatSystem;

  constructor(container) {
    this.container = container;
    this.gameState = GameState.getInstance();
    this.combatSystem = new CombatSystem();
    this.clock = new THREE.Clock();

    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.container.appendChild(this.renderer.domElement);

    // 初始化场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.05);

    // 初始化相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // 监听窗口大小变化
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 设置基础照明
    this.setupLighting();
  }

  /**
   * 设置场景基础光照
   */
  setupLighting() {
    // 环境光 - 极暗，营造古墓氛围
    const ambientLight = new THREE.AmbientLight(0x001133, 0.15);
    this.scene.add(ambientLight);

    // 方向光 - 微弱的月光/天光从缝隙照入
    const moonLight = new THREE.DirectionalLight(0x2244aa, 0.2);
    moonLight.position.set(10, 20, 10);
    moonLight.castShadow = true;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 50;
    moonLight.shadow.camera.left = -20;
    moonLight.shadow.camera.right = 20;
    moonLight.shadow.camera.top = 20;
    moonLight.shadow.camera.bottom = -20;
    this.scene.add(moonLight);
  }

  /**
   * 开始游戏
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.gameLoop();
  }

  /**
   * 停止游戏
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * 游戏主循环
   */
  gameLoop() {
    if (!this.isRunning) return;

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 更新玩家
    if (this.player) {
      this.player.update(deltaTime);
      // 相机跟随玩家
      this.updateCamera();
    }

    // 更新地图实体
    if (this.currentMap) {
      this.currentMap.update(deltaTime, elapsedTime);
    }

    // 更新战斗系统
    this.combatSystem.update(deltaTime);

    // 渲染
    this.renderer.render(this.scene, this.camera);

    // 下一帧
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * 更新相机位置（第三人称视角）
   */
  updateCamera() {
    if (!this.player) return;
    const playerPos = this.player.getPosition();
    const playerRotation = this.player.getRotation();

    // 相机位于玩家后方偏上
    const offset = new THREE.Vector3(0, 3, -5);
    offset.applyEuler(playerRotation);

    const targetPos = playerPos.clone().add(offset);
    this.camera.position.lerp(targetPos, 0.1);
    this.camera.lookAt(playerPos.x, playerPos.y + 1.5, playerPos.z);
  }

  /**
   * 加载地图
   */
  loadMap(map) {
    // 清除旧地图
    if (this.currentMap) {
      this.currentMap.dispose();
    }

    this.currentMap = map;
    this.scene.add(map.getMesh());

    // 在地图上生成玩家出生点
    const spawnPoint = map.getRandomSpawnPoint();
    this.createPlayer(spawnPoint);
  }

  /**
   * 创建玩家
   */
  createPlayer(position) {
    if (this.player) {
      this.player.dispose();
      this.scene.remove(this.player.getMesh());
    }

    this.player = new Player();
    this.player.setPosition(position);
    this.scene.add(this.player.getMesh());

    // 相机初始位置
    this.camera.position.copy(position).add(new THREE.Vector3(0, 3, -5));
    this.camera.lookAt(position);
  }

  /**
   * 窗口大小变化处理
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * 获取场景
   */
  getScene() {
    return this.scene;
  }

  /**
   * 获取相机
   */
  getCamera() {
    return this.camera;
  }

  /**
   * 获取渲染器
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * 获取玩家
   */
  getPlayer() {
    return this.player;
  }

  /**
   * 获取当前地图
   */
  getCurrentMap() {
    return this.currentMap;
  }

  /**
   * 清理资源
   */
  dispose() {
    this.isRunning = false;
    if (this.player) {
      this.player.dispose();
    }
    if (this.currentMap) {
      this.currentMap.dispose();
    }
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}
