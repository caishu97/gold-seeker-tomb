import * as THREE from 'three';
import { GameState } from '../game/GameState.js';

/**
 * 玩家实体
 * 处理玩家移动、碰撞、视角等
 */
export class Player {
  mesh;
  position;
  velocity;
  rotation;
  speed = 5;
  health = 100;
  maxHealth = 100;
  stamina = 100;
  isSprinting = false;

  // 输入状态
  inputState = {
    up: false,
    left: false,
    down: false,
    right: false,
    shift: false,
    space: false,
    mouseX: 0,
    mouseY: 0,
  };

  mouseSensitivity = 0.002;
  isPointerLocked = false;

  constructor() {
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 1, 0);
    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

    this.createVisual();
    this.setupInput();
  }

  /**
   * 创建玩家视觉表现
   */
  createVisual() {
    // 身体
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d6e40 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    this.mesh.add(body);

    // 头部
    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x2d5e30 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5;
    this.mesh.add(head);

    // 手电筒（点光源）
    const light = new THREE.SpotLight(0xffffee, 5, 20, Math.PI / 4, 0.5, 2);
    light.position.set(0, 1.5, 0);
    light.target.position.set(0, 1.5, 1);
    this.mesh.add(light);
    this.mesh.add(light.target);
  }

  /**
   * 设置输入监听
   */
  setupInput() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('click', () => this.requestPointerLock());
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement !== null;
    });
  }

  requestPointerLock() {
    document.body.requestPointerLock();
  }

  onKeyDown(event) {
    switch (event.key) {
      case 'ArrowUp': this.inputState.up = true; break;
      case 'ArrowLeft': this.inputState.left = true; break;
      case 'ArrowDown': this.inputState.down = true; break;
      case 'ArrowRight': this.inputState.right = true; break;
      case 'Shift': this.inputState.shift = true; break;
      case ' ': this.inputState.space = true; break;
    }
  }

  onKeyUp(event) {
    switch (event.key) {
      case 'ArrowUp': this.inputState.up = false; break;
      case 'ArrowLeft': this.inputState.left = false; break;
      case 'ArrowDown': this.inputState.down = false; break;
      case 'ArrowRight': this.inputState.right = false; break;
      case 'Shift': this.inputState.shift = false; break;
      case ' ': this.inputState.space = false; break;
    }
  }

  onMouseMove(event) {
    if (!this.isPointerLocked) return;
    this.inputState.mouseX += event.movementX;
    this.inputState.mouseY += event.movementY;
  }

  /**
   * 更新玩家状态
   */
  update(deltaTime) {
    this.updateRotation();
    this.updateMovement(deltaTime);
    this.updateMesh();
  }

  /**
   * 更新视角旋转
   */
  updateRotation() {
    if (!this.isPointerLocked) return;

    this.rotation.y -= this.inputState.mouseX * this.mouseSensitivity;
    this.rotation.x -= this.inputState.mouseY * this.mouseSensitivity;
    this.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.rotation.x));

    this.inputState.mouseX = 0;
    this.inputState.mouseY = 0;
  }

  /**
   * 更新移动
   */
  updateMovement(deltaTime) {
    const moveDirection = new THREE.Vector3();

    if (this.inputState.up) moveDirection.z += 1;
    if (this.inputState.down) moveDirection.z -= 1;
    if (this.inputState.left) moveDirection.x -= 1;
    if (this.inputState.right) moveDirection.x += 1;

    if (moveDirection.length() > 0) {
      moveDirection.normalize();

      // 考虑视角方向的移动
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
      const right = new THREE.Vector3(1, 0, 0);
      right.applyEuler(new THREE.Euler(0, this.rotation.y, 0));

      const worldMove = new THREE.Vector3()
        .addScaledVector(forward, moveDirection.z)
        .addScaledVector(right, moveDirection.x);

      const currentSpeed = this.inputState.shift && this.stamina > 0 ? this.speed * 1.6 : this.speed;
      this.velocity.x = worldMove.x * currentSpeed;
      this.velocity.z = worldMove.z * currentSpeed;

      // 体力消耗
      if (this.inputState.shift) {
        this.stamina = Math.max(0, this.stamina - deltaTime * 30);
      } else {
        this.stamina = Math.min(100, this.stamina + deltaTime * 20);
      }
    } else {
      this.velocity.x *= 0.9;
      this.velocity.z *= 0.9;
      this.stamina = Math.min(100, this.stamina + deltaTime * 30);
    }

    // 应用移动
    const newPosition = this.position.clone();
    newPosition.x += this.velocity.x * deltaTime;
    newPosition.z += this.velocity.z * deltaTime;

    // 简单的地面碰撞检测（后续需要与地图碰撞系统集成）
    newPosition.y = 1; // 保持在地面高度

    this.position.copy(newPosition);
  }

  /**
   * 更新网格位置和朝向
   */
  updateMesh() {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation.y;
  }

  /**
   * 获取位置
   */
  getPosition() {
    return this.position.clone();
  }

  /**
   * 设置位置
   */
  setPosition(pos) {
    this.position.copy(pos);
    this.mesh.position.copy(pos);
  }

  /**
   * 获取旋转
   */
  getRotation() {
    return this.rotation.clone();
  }

  /**
   * 获取网格
   */
  getMesh() {
    return this.mesh;
  }

  /**
   * 受伤
   */
  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    GameState.getInstance().takeDamage(damage);
  }

  /**
   * 获取血量
   */
  getHealth() {
    return this.health;
  }

  /**
   * 获取体力
   */
  getStamina() {
    return this.stamina;
  }

  /**
   * 清理资源
   */
  dispose() {
    // 移除事件监听
    document.removeEventListener('keydown', (e) => this.onKeyDown(e));
    document.removeEventListener('keyup', (e) => this.onKeyUp(e));
    document.removeEventListener('mousemove', (e) => this.onMouseMove(e));

    // 释放几何体和材质
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
