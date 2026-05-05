import * as THREE from 'three';
import { Monster } from '../entities/Monster.js';
import { Player } from '../entities/Player.js';

/**
 * 战斗系统
 * 处理玩家与怪物之间的战斗逻辑
 */
export class CombatSystem {
  monsters = [];
  player = null;
  bullets = [];
  lastAttackTime = 0;

  constructor() {
    this.setupInput();
  }

  /**
   * 设置战斗输入
   */
  setupInput() {
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
  }

  onMouseDown(event) {
    if (event.button === 0) { // 左键攻击
      this.playerAttack();
    }
  }

  /**
   * 玩家攻击
   */
  playerAttack() {
    const now = Date.now();
    if (now - this.lastAttackTime < 500) return; // 攻击间隔500ms
    this.lastAttackTime = now;

    if (!this.player) return;

    const playerPos = this.player.getPosition();
    const playerRot = this.player.getRotation();

    // 检测最近的目标
    let nearestMonster = null;
    let nearestDist = Infinity;

    for (const monster of this.monsters) {
      if (!monster.isAliveCheck()) continue;
      const dist = playerPos.distanceTo(monster.getPosition());
      if (dist < nearestDist && dist < 3) { // 近战范围3米
        nearestDist = dist;
        nearestMonster = monster;
      }
    }

    if (nearestMonster) {
      nearestMonster.takeDamage(25);
      this.createHitEffect(nearestMonster.getPosition());
    } else {
      // 远程攻击
      this.createBullet(playerPos, playerRot);
    }
  }

  /**
   * 创建子弹
   */
  createBullet(position, rotation) {
    const bullet = {
      position: position.clone().add(new THREE.Vector3(0, 1.5, 0)),
      velocity: new THREE.Vector3()
        .addScaledVector(new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, rotation.y, 0)), 20),
      life: 2,
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.05),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      ),
    };

    // 创建发光效果
    const light = new THREE.PointLight(0xffff00, 1, 2);
    bullet.mesh.add(light);

    this.bullets.push(bullet);
  }

  /**
   * 更新子弹
   */
  updateBullets(deltaTime) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.life -= deltaTime;

      if (bullet.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }

      bullet.position.addScaledVector(bullet.velocity, deltaTime);
      bullet.mesh.position.copy(bullet.position);

      // 检测碰撞
      for (const monster of this.monsters) {
        if (!monster.isAliveCheck()) continue;
        if (bullet.position.distanceTo(monster.getPosition()) < 0.8) {
          monster.takeDamage(15);
          this.bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  /**
   * 创建受击特效
   */
  createHitEffect(position) {
    // 简单的粒子效果
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      particle.position.copy(position);
      particle.position.y += 1;
      // 简化处理，实际应该添加到场景并有动画
    }
  }

  /**
   * 注册怪物
   */
  registerMonster(monster) {
    this.monsters.push(monster);
  }

  /**
   * 注册玩家
   */
  registerPlayer(player) {
    this.player = player;
  }

  /**
   * 更新战斗系统
   */
  update(deltaTime) {
    this.updateBullets(deltaTime);
  }

  /**
   * 获取所有怪物
   */
  getMonsters() {
    return this.monsters;
  }
}
