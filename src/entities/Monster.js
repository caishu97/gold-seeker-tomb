import * as THREE from 'three';
import { GameState } from '../game/GameState.js';

/**
 * 怪物实体
 * 具有简单的AI行为：巡逻、追击玩家
 */
export class Monster {
  mesh;
  position;
  velocity;
  health = 50;
  damage = 10;
  speed = 2;
  detectionRange = 8;
  attackRange = 1.5;
  attackCooldown = 0;
  isAlive = true;

  // AI状态
  aiState = MonsterAIState.PATROL;
  patrolTarget = null;
  stateTimer = 0;

  constructor(position) {
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.mesh = new THREE.Group();
    this.createVisual();
  }

  /**
   * 创建怪物视觉表现
   */
  createVisual() {
    const monsterType = Math.floor(Math.random() * 3);
    let color = 0xff0000;
    let scale = 1;

    switch (monsterType) {
      case 0: // 普通骷髅
        color = 0xeeeeee;
        scale = 1;
        break;
      case 1: // 僵尸
        color = 0x2d5a27;
        scale = 1.2;
        break;
      case 2: // 幽灵
        color = 0x8844ff;
        scale = 0.9;
        break;
    }

    // 身体
    const bodyGeo = new THREE.CapsuleGeometry(0.25 * scale, 0.8 * scale, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6 * scale;
    body.castShadow = true;
    this.mesh.add(body);

    // 眼睛
    const eyeGeo = new THREE.SphereGeometry(0.06 * scale, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1 * scale, 1.0 * scale, 0.15 * scale);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1 * scale, 1.0 * scale, 0.15 * scale);
    this.mesh.add(leftEye, rightEye);

    this.mesh.position.copy(this.position);
  }

  /**
   * 更新怪物AI和状态
   */
  update(deltaTime) {
    if (!this.isAlive) return;

    this.stateTimer += deltaTime;
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

    const player = GameState.getInstance().getPlayer();
    const playerPos = player?.getPosition ? player.getPosition() : null;

    if (playerPos) {
      const distToPlayer = this.position.distanceTo(playerPos);

      switch (this.aiState) {
        case MonsterAIState.PATROL:
          this.patrol(deltaTime);
          if (distToPlayer < this.detectionRange) {
            this.setState(MonsterAIState.CHASE);
          }
          break;

        case MonsterAIState.CHASE:
          this.chase(playerPos, deltaTime);
          if (distToPlayer > this.detectionRange * 1.5) {
            this.setState(MonsterAIState.PATROL);
          } else if (distToPlayer < this.attackRange) {
            this.setState(MonsterAIState.ATTACK);
          }
          break;

        case MonsterAIState.ATTACK:
          if (distToPlayer > this.attackRange * 1.2) {
            this.setState(MonsterAIState.CHASE);
          } else {
            this.attack(player);
          }
          this.faceTarget(playerPos);
          break;

        case MonsterAIState.IDLE:
          if (this.stateTimer > 2) {
            this.setState(MonsterAIState.PATROL);
          }
          if (distToPlayer < this.detectionRange) {
            this.setState(MonsterAIState.CHASE);
          }
          break;
      }
    }

    // 应用移动
    this.position.x += this.velocity.x * deltaTime;
    this.position.z += this.velocity.z * deltaTime;

    // 确保在地面上
    this.position.y = 0.5;

    // 更新网格位置
    this.mesh.position.copy(this.position);

    // 怪物悬浮动画
    this.mesh.position.y += Math.sin(Date.now() * 0.003) * 0.1;
  }

  /**
   * 巡逻行为
   */
  patrol(deltaTime) {
    if (!this.patrolTarget || this.position.distanceTo(this.patrolTarget) < 0.5 || this.stateTimer > 5) {
      // 随机选择新的巡逻目标
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 5;
      this.patrolTarget = new THREE.Vector3(
        this.position.x + Math.cos(angle) * dist,
        this.position.y,
        this.position.z + Math.sin(angle) * dist
      );
      this.stateTimer = 0;
    }

    if (this.patrolTarget) {
      const direction = new THREE.Vector3()
        .subVectors(this.patrolTarget, this.position)
        .normalize();
      this.velocity.x = direction.x * this.speed * 0.5;
      this.velocity.z = direction.z * this.speed * 0.5;
      this.faceTarget(this.patrolTarget);
    }
  }

  /**
   * 追击玩家
   */
  chase(playerPos, deltaTime) {
    const direction = new THREE.Vector3()
      .subVectors(playerPos, this.position)
      .normalize();
    this.velocity.x = direction.x * this.speed;
    this.velocity.z = direction.z * this.speed;
    this.faceTarget(playerPos);
  }

  /**
   * 攻击玩家
   */
  attack(player) {
    if (this.attackCooldown <= 0) {
      player.takeDamage(this.damage);
      this.attackCooldown = 1.0; // 1秒攻击间隔
    }
  }

  /**
   * 面向目标
   */
  faceTarget(target) {
    const angle = Math.atan2(target.x - this.position.x, target.z - this.position.z);
    this.mesh.rotation.y = angle;
  }

  /**
   * 设置AI状态
   */
  setState(newState) {
    this.aiState = newState;
    this.stateTimer = 0;
  }

  /**
   * 受伤
   */
  takeDamage(damage) {
    this.health -= damage;
    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * 死亡
   */
  die() {
    this.isAlive = false;
    // 死亡动画 - 缩小消失
    const fadeOut = () => {
      this.mesh.scale.multiplyScalar(0.9);
      if (this.mesh.scale.x > 0.01) {
        requestAnimationFrame(fadeOut);
      } else {
        this.mesh.visible = false;
      }
    };
    fadeOut();
  }

  /**
   * 是否存活
   */
  isAliveCheck() {
    return this.isAlive;
  }

  /**
   * 获取位置
   */
  getPosition() {
    return this.position.clone();
  }

  /**
   * 获取网格
   */
  getMesh() {
    return this.mesh;
  }

  /**
   * 获取攻击力
   */
  getDamage() {
    return this.damage;
  }
}

export const MonsterAIState = {
  IDLE: 'IDLE',
  PATROL: 'PATROL',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  DEAD: 'DEAD',
};
