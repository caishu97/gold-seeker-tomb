import * as THREE from 'three';
import { ItemRarity } from '../game/GameState.js';

/**
 * 宝箱实体
 */
export class Chest {
  mesh;
  position;
  isOpen = false;
  items = [];
  openAnimation = 0;
  lidMesh = null;

  constructor(position) {
    this.position = position.clone();
    this.position.y = 0;
    this.mesh = new THREE.Group();
    this.generateItems();
    this.createVisual();
    this.mesh.position.copy(this.position);
  }

  /**
   * 生成宝箱内物品
   */
  generateItems() {
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const possibleItems = [
      { name: '古铜币', minValue: 10, maxValue: 50, minWeight: 0.1, maxWeight: 0.5 },
      { name: '玉佩', minValue: 100, maxValue: 500, minWeight: 0.2, maxWeight: 0.8 },
      { name: '金镯', minValue: 500, maxValue: 2000, minWeight: 0.3, maxWeight: 1.0 },
      { name: '翡翠项链', minValue: 1000, maxValue: 5000, minWeight: 0.1, maxWeight: 0.3 },
      { name: '古墓卷轴', minValue: 200, maxValue: 1000, minWeight: 0.1, maxWeight: 0.2 },
      { name: '青铜爵', minValue: 800, maxValue: 3000, minWeight: 1.0, maxWeight: 2.0 },
      { name: '夜明珠', minValue: 3000, maxValue: 10000, minWeight: 0.2, maxWeight: 0.5 },
    ];

    for (let i = 0; i < itemCount; i++) {
      const template = possibleItems[Math.floor(Math.random() * possibleItems.length)];
      const value = template.minValue + Math.floor(Math.random() * (template.maxValue - template.minValue));
      const weight = parseFloat((template.minWeight + Math.random() * (template.maxWeight - template.minWeight)).toFixed(2));

      this.items.push({
        id: `item_${Date.now()}_${i}`,
        name: template.name,
        description: `一件珍贵的${template.name}`,
        value,
        weight,
        rarity: this.getRarityByValue(value),
      });
    }
  }

  /**
   * 根据价值确定稀有度
   */
  getRarityByValue(value) {
    if (value >= 5000) return ItemRarity.LEGENDARY;
    if (value >= 2000) return ItemRarity.EPIC;
    if (value >= 500) return ItemRarity.RARE;
    if (value >= 100) return ItemRarity.UNCOMMON;
    return ItemRarity.COMMON;
  }

  /**
   * 创建宝箱视觉表现
   */
  createVisual() {
    const chestColor = this.getRarityColor();

    // 宝箱底座
    const baseGeo = new THREE.BoxGeometry(0.8, 0.4, 0.5);
    const baseMat = new THREE.MeshStandardMaterial({
      color: chestColor,
      roughness: 0.6,
      metalness: 0.4,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    this.mesh.add(base);

    // 宝箱盖子（可打开）
    const lidGeo = new THREE.BoxGeometry(0.8, 0.3, 0.5);
    const lidMat = new THREE.MeshStandardMaterial({
      color: chestColor,
      roughness: 0.6,
      metalness: 0.4,
    });
    this.lidMesh = new THREE.Mesh(lidGeo, lidMat);
    this.lidMesh.position.y = 0.55;
    this.lidMesh.castShadow = true;
    this.mesh.add(this.lidMesh);

    // 锁扣
    const lockGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05);
    const lockMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.9,
    });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(0, 0.35, 0.25);
    this.mesh.add(lock);

    // 发光效果（高稀有度宝箱）
    if (this.getHighestRarityValue() >= ItemRarity.RARE) {
      const light = new THREE.PointLight(chestColor, 2, 3);
      light.position.set(0, 0.5, 0);
      this.mesh.add(light);
    }
  }

  /**
   * 获取稀有度颜色
   */
  getRarityColor() {
    const highest = this.getHighestRarityValue();
    switch (highest) {
      case ItemRarity.LEGENDARY: return 0xff6b00;
      case ItemRarity.EPIC: return 0x9b59b6;
      case ItemRarity.RARE: return 0x3498db;
      case ItemRarity.UNCOMMON: return 0x2ecc71;
      default: return 0xb8860b;
    }
  }

  /**
   * 获取最高稀有度
   */
  getHighestRarityValue() {
    const rarityOrder = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.LEGENDARY];
    let highestIndex = 0;
    for (const item of this.items) {
      const index = rarityOrder.indexOf(item.rarity);
      if (index > highestIndex) highestIndex = index;
    }
    return rarityOrder[highestIndex];
  }

  /**
   * 更新宝箱状态
   */
  update(_deltaTime, elapsedTime) {
    if (!this.isOpen) {
      // 悬浮动画
      this.mesh.position.y = this.position.y + Math.sin(elapsedTime * 1.5) * 0.05;

      // 旋转动画（高稀有度）
      if (this.getHighestRarityValue() >= ItemRarity.RARE) {
        this.mesh.rotation.y += 0.005;
      }
    } else if (this.lidMesh) {
      // 打开动画
      this.openAnimation = Math.min(1, this.openAnimation + 0.02);
      this.lidMesh.rotation.z = this.openAnimation * (-Math.PI / 2.5);
    }
  }

  /**
   * 打开宝箱
   */
  open() {
    if (this.isOpen) return null;

    this.isOpen = true;
    return this.items;
  }

  /**
   * 是否已打开
   */
  isOpened() {
    return this.isOpen;
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
}
