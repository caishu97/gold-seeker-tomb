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
   * 创建怪物视觉表现 - 明显可见的妖怪设计
   */
  createVisual() {
    const monsterType = Math.floor(Math.random() * 3);
    let mainColor;
    let glowColor;
    let scale = 1.5;

    switch (monsterType) {
      case 0: // 火焰骷髅 - 红色发光
        mainColor = 0xffffff;
        glowColor = 0xff3300;
        this.createFireSkeleton(scale, mainColor, glowColor);
        break;
      case 1: // 剧毒僵尸 - 绿色发光
        mainColor = 0x2d5a27;
        glowColor = 0x00ff00;
        this.createToxicZombie(scale, mainColor, glowColor);
        break;
      case 2: // 暗影幽灵 - 紫色发光半透明
        mainColor = 0x6666ff;
        glowColor = 0xff00ff;
        this.createShadowGhost(scale, mainColor, glowColor);
        break;
    }

    this.mesh.position.copy(this.position);
  }

  createFireSkeleton(scale, mainColor, glowColor) {
    // 头骨
    const skullGeo = new THREE.SphereGeometry(0.35 * scale, 12, 12);
    const skullMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.5,
      emissive: glowColor,
      emissiveIntensity: 0.3,
    });
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.position.y = 2.0 * scale;
    this.mesh.add(skull);

    // 发光的眼睛
    const eyeGeo = new THREE.SphereGeometry(0.08 * scale, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12 * scale, 2.05 * scale, 0.25 * scale);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12 * scale, 2.05 * scale, 0.25 * scale);
    this.mesh.add(leftEye, rightEye);

    // 脊椎
    const spineGeo = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 1.2 * scale, 8);
    const spineMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: glowColor, emissiveIntensity: 0.2 });
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.position.y = 1.2 * scale;
    this.mesh.add(spine);

    // 胸腔
    const ribGeo = new THREE.BoxGeometry(0.5 * scale, 0.6 * scale, 0.35 * scale);
    const ribMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: glowColor, emissiveIntensity: 0.1 });
    const ribs = new THREE.Mesh(ribGeo, ribMat);
    ribs.position.y = 1.4 * scale;
    this.mesh.add(ribs);

    // 手臂
    const armGeo = new THREE.CylinderGeometry(0.08 * scale, 0.06 * scale, 0.8 * scale, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5 * scale, 1.3 * scale, 0);
    leftArm.rotation.z = 0.3;
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.5 * scale, 1.3 * scale, 0);
    rightArm.rotation.z = -0.3;
    this.mesh.add(leftArm, rightArm);

    // 武器 - 火焰剑
    const swordHandleGeo = new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.3 * scale, 6);
    const swordBladeGeo = new THREE.BoxGeometry(0.06 * scale, 0.8 * scale, 0.02 * scale);
    const swordHandleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const swordBladeMat = new THREE.MeshStandardMaterial({ 
      color: glowColor, 
      emissive: glowColor, 
      emissiveIntensity: 0.8 
    });
    const swordHandle = new THREE.Mesh(swordHandleGeo, swordHandleMat);
    const swordBlade = new THREE.Mesh(swordBladeGeo, swordBladeMat);
    swordHandle.position.set(0, -0.2 * scale, 0);
    swordBlade.position.set(0, 0.3 * scale, 0);
    
    const swordGroup = new THREE.Group();
    swordGroup.add(swordHandle, swordBlade);
    swordGroup.position.set(0.55 * scale, 1.0 * scale, 0.2 * scale);
    swordGroup.rotation.z = -0.5;
    this.mesh.add(swordGroup);

    // 火焰粒子效果（橙色小球）
    for (let i = 0; i < 5; i++) {
      const flameGeo = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 6, 6);
      const flameMat = new THREE.MeshBasicMaterial({ 
        color: glowColor, 
        transparent: true, 
        opacity: 0.7 
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(
        (Math.random() - 0.5) * 0.5 * scale,
        (2 + Math.random()) * scale,
        (Math.random() - 0.5) * 0.5 * scale
      );
      flame.userData = { offset: Math.random() * Math.PI * 2, speed: 2 + Math.random() * 3 };
      this.mesh.add(flame);
    }

    // 身体发光
    const bodyLight = new THREE.PointLight(glowColor, 3, 8);
    bodyLight.position.y = 1.5 * scale;
    this.mesh.add(bodyLight);
  }

  createToxicZombie(scale, mainColor, glowColor) {
    // 腐烂的身体
    const bodyGeo = new THREE.CapsuleGeometry(0.4 * scale, 1.0 * scale, 6, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.9,
      emissive: glowColor,
      emissiveIntensity: 0.15,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1 * scale;
    body.castShadow = true;
    this.mesh.add(body);

    // 肿胀的头部
    const headGeo = new THREE.SphereGeometry(0.35 * scale, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x3a6b30,
      roughness: 0.8,
      emissive: glowColor,
      emissiveIntensity: 0.2,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.0 * scale;
    this.mesh.add(head);

    // 发光的黄色眼睛
    const eyeGeo = new THREE.SphereGeometry(0.1 * scale, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12 * scale, 2.0 * scale, 0.28 * scale);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12 * scale, 2.0 * scale, 0.28 * scale);
    this.mesh.add(leftEye, rightEye);

    // 张开的嘴巴（绿色发光）
    const mouthGeo = new THREE.BoxGeometry(0.2 * scale, 0.1 * scale, 0.05 * scale);
    const mouthMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 1.85 * scale, 0.32 * scale);
    this.mesh.add(mouth);

    // 腐烂的手臂
    const armGeo = new THREE.CapsuleGeometry(0.12 * scale, 0.7 * scale, 4, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5 * scale, 1.3 * scale, 0);
    leftArm.rotation.z = 0.2;
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.5 * scale, 1.3 * scale, 0);
    rightArm.rotation.z = -0.2;
    this.mesh.add(leftArm, rightArm);

    // 毒液滴落效果（绿色球体）
    for (let i = 0; i < 3; i++) {
      const venomGeo = new THREE.SphereGeometry(0.08 * scale, 6, 6);
      const venomMat = new THREE.MeshBasicMaterial({ 
        color: glowColor, 
        transparent: true, 
        opacity: 0.6 
      });
      const venom = new THREE.Mesh(venomGeo, venomMat);
      venom.position.set(
        (Math.random() - 0.5) * 0.3 * scale,
        (0.8 + Math.random() * 0.5) * scale,
        0.4 * scale
      );
      this.mesh.add(venom);
    }

    // 毒雾光
    const toxicLight = new THREE.PointLight(glowColor, 2, 6);
    toxicLight.position.y = 1.5 * scale;
    this.mesh.add(toxicLight);
  }

  createShadowGhost(scale, mainColor, glowColor) {
    // 幽灵身体 - 半透明
    const bodyGeo = new THREE.ConeGeometry(0.4 * scale, 1.5 * scale, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      transparent: true,
      opacity: 0.6,
      roughness: 0.3,
      emissive: glowColor,
      emissiveIntensity: 0.4,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2 * scale;
    this.mesh.add(body);

    // 幽灵头部
    const headGeo = new THREE.SphereGeometry(0.3 * scale, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x6666ff,
      transparent: true,
      opacity: 0.7,
      emissive: glowColor,
      emissiveIntensity: 0.5,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.1 * scale;
    this.mesh.add(head);

    // 两个大的发光眼睛
    const eyeGeo = new THREE.SphereGeometry(0.12 * scale, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1 * scale, 2.1 * scale, 0.22 * scale);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1 * scale, 2.1 * scale, 0.22 * scale);
    this.mesh.add(leftEye, rightEye);

    // 幽灵手臂（飘带状）
    const armGeo = new THREE.CylinderGeometry(0.05 * scale, 0.02 * scale, 0.8 * scale, 6);
    const armMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      transparent: true,
      opacity: 0.5,
      emissive: glowColor,
      emissiveIntensity: 0.3,
    });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.4 * scale, 1.5 * scale, 0);
    leftArm.rotation.z = 0.4;
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.4 * scale, 1.5 * scale, 0);
    rightArm.rotation.z = -0.4;
    this.mesh.add(leftArm, rightArm);

    // 幽灵尾巴
    const tailGeo = new THREE.ConeGeometry(0.15 * scale, 0.8 * scale, 6);
    const tailMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      transparent: true,
      opacity: 0.4,
      emissive: glowColor,
      emissiveIntensity: 0.3,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.y = 0.3 * scale;
    tail.rotation.x = Math.PI;
    this.mesh.add(tail);

    // 紫色光晕
    const glowGeo = new THREE.SphereGeometry(1.2 * scale, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 1.5 * scale;
    this.mesh.add(glow);

    // 紫色点光源
    const ghostLight = new THREE.PointLight(glowColor, 3, 10);
    ghostLight.position.y = 1.5 * scale;
    this.mesh.add(ghostLight);
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
