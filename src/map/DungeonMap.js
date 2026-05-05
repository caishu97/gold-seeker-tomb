import * as THREE from 'three';
import { DungeonGenerator, CellType } from './DungeonGenerator.js';
import { Monster } from '../entities/Monster.js';
import { Chest } from '../entities/Chest.js';

/**
 * 古墓地图类
 * 负责将生成的网格数据转换为3D场景
 */
export class DungeonMap {
  data;
  mesh;
  monsters = [];
  chests = [];
  evacuationZone = null;
  collisionBounds = [];

  static CELL_SIZE = 2; // 每个网格单元2米
  static WALL_HEIGHT = 3; // 墙高3米

  constructor(seed) {
    const generator = new DungeonGenerator(40, 40, 2, seed);
    this.data = generator.generate();
    this.mesh = new THREE.Group();
    this.buildMesh();
    this.spawnEntities();
  }

  /**
   * 构建3D网格
   */
  buildMesh() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xc4956a,
      roughness: 0.7,
      metalness: 0.05,
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.02,
    });
    const stairMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.8,
      metalness: 0.2,
    });

    const wallInstances = [];
    const floorInstances = [];
    const stairInstances = [];

    for (let d = 0; d < this.data.depth; d++) {
      for (let y = 0; y < this.data.height; y++) {
        for (let x = 0; x < this.data.width; x++) {
          const cell = this.data.grid[d][y][x];
          const posX = x * DungeonMap.CELL_SIZE;
          const posY = d * DungeonMap.CELL_SIZE;
          const posZ = y * DungeonMap.CELL_SIZE;

          if (cell === CellType.WALL) {
            // 墙
            const matrix = new THREE.Matrix4();
            matrix.compose(
              new THREE.Vector3(posX, posY + DungeonMap.WALL_HEIGHT / 2, posZ),
              new THREE.Quaternion(),
              new THREE.Vector3(DungeonMap.CELL_SIZE, DungeonMap.WALL_HEIGHT, DungeonMap.CELL_SIZE)
            );
            wallInstances.push(matrix);
          } else if (cell === CellType.FLOOR) {
            // 地板
            const matrix = new THREE.Matrix4();
            matrix.compose(
              new THREE.Vector3(posX, posY, posZ),
              new THREE.Quaternion(),
              new THREE.Vector3(DungeonMap.CELL_SIZE, 0.2, DungeonMap.CELL_SIZE)
            );
            floorInstances.push(matrix);

            // 天花板（不在最顶层）
            if (d < this.data.depth - 1) {
              const ceilMatrix = new THREE.Matrix4();
              ceilMatrix.compose(
                new THREE.Vector3(posX, posY + DungeonMap.WALL_HEIGHT, posZ),
                new THREE.Quaternion(),
                new THREE.Vector3(DungeonMap.CELL_SIZE, 0.2, DungeonMap.CELL_SIZE)
              );
              wallInstances.push(ceilMatrix);
            }
          } else if (cell === CellType.STAIR) {
            // 楼梯 - 斜坡
            const matrix = new THREE.Matrix4();
            matrix.compose(
              new THREE.Vector3(posX, posY + DungeonMap.CELL_SIZE / 2, posZ),
              new THREE.Quaternion(),
              new THREE.Vector3(DungeonMap.CELL_SIZE, DungeonMap.CELL_SIZE, DungeonMap.CELL_SIZE)
            );
            stairInstances.push(matrix);
          }
        }
      }
    }

    // 使用InstancedMesh优化性能
    if (wallInstances.length > 0) {
      const wallMesh = new THREE.InstancedMesh(geometry, wallMaterial, wallInstances.length);
      wallInstances.forEach((matrix, i) => wallMesh.setMatrixAt(i, matrix));
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      this.mesh.add(wallMesh);
    }

    if (floorInstances.length > 0) {
      const floorMesh = new THREE.InstancedMesh(geometry, floorMaterial, floorInstances.length);
      floorInstances.forEach((matrix, i) => floorMesh.setMatrixAt(i, matrix));
      floorMesh.receiveShadow = true;
      this.mesh.add(floorMesh);
    }

    if (stairInstances.length > 0) {
      const stairMesh = new THREE.InstancedMesh(geometry, stairMaterial, stairInstances.length);
      stairInstances.forEach((matrix, i) => stairMesh.setMatrixAt(i, matrix));
      stairMesh.receiveShadow = true;
      this.mesh.add(stairMesh);
    }

    // 创建撤离点标记
    this.createEvacuationZone();
  }

  /**
   * 创建撤离点标记
   */
  createEvacuationZone() {
    const evacPos = this.data.evacuationPoint.clone().multiplyScalar(DungeonMap.CELL_SIZE);
    evacPos.y = 0.1;

    // 地面上发光圆环
    const geometry = new THREE.RingGeometry(1, 1.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    this.evacuationZone = new THREE.Mesh(geometry, material);
    this.evacuationZone.rotation.x = -Math.PI / 2;
    this.evacuationZone.position.copy(evacPos);
    this.mesh.add(this.evacuationZone);

    // 光柱效果
    const pillarGeo = new THREE.CylinderGeometry(0.3, 1.2, 4, 8, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(evacPos.x, 2, evacPos.z);
    this.mesh.add(pillar);

    // 点光源
    const light = new THREE.PointLight(0x00ff88, 2, 10);
    light.position.set(evacPos.x, 2, evacPos.z);
    this.mesh.add(light);
  }

  /**
   * 生成实体（怪物、宝箱）
   */
  spawnEntities() {
    // 生成怪物
    for (const point of this.data.monsterPoints) {
      const worldPos = point.clone().multiplyScalar(DungeonMap.CELL_SIZE);
      const monster = new Monster(worldPos);
      this.monsters.push(monster);
      this.mesh.add(monster.getMesh());
    }

    // 生成宝箱
    for (const point of this.data.chestPoints) {
      const worldPos = point.clone().multiplyScalar(DungeonMap.CELL_SIZE);
      const chest = new Chest(worldPos);
      this.chests.push(chest);
      this.mesh.add(chest.getMesh());
    }
  }

  /**
   * 更新地图实体
   */
  update(deltaTime, elapsedTime) {
    // 更新撤离点动画
    if (this.evacuationZone) {
      const scale = 1 + Math.sin(elapsedTime * 2) * 0.1;
      this.evacuationZone.scale.set(scale, scale, scale);
      (this.evacuationZone.material).opacity = 0.4 + Math.sin(elapsedTime * 2) * 0.2;
    }

    // 更新怪物
    for (const monster of this.monsters) {
      monster.update(deltaTime);
    }

    // 更新宝箱
    for (const chest of this.chests) {
      chest.update(deltaTime, elapsedTime);
    }
  }

  /**
   * 获取网格对象
   */
  getMesh() {
    return this.mesh;
  }

  /**
   * 获取随机出生点
   */
  getRandomSpawnPoint() {
    return this.data.spawnPoint.clone().multiplyScalar(DungeonMap.CELL_SIZE);
  }

  /**
   * 获取撤离点位置
   */
  getEvacuationPoint() {
    return this.data.evacuationPoint.clone().multiplyScalar(DungeonMap.CELL_SIZE);
  }

  /**
   * 检查是否可以撤离
   */
  canEvacuate(playerPos) {
    const evacPos = this.getEvacuationPoint();
    const dist = Math.sqrt(
      Math.pow(playerPos.x - evacPos.x, 2) + 
      Math.pow(playerPos.z - evacPos.z, 2)
    );
    return dist < 3;
  }

  /**
   * 检查碰撞
   */
  checkCollision(position, radius = 0.5) {
    const gridX = Math.floor(position.x / DungeonMap.CELL_SIZE);
    const gridZ = Math.floor(position.z / DungeonMap.CELL_SIZE);

    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const checkX = gridX + x;
        const checkY = gridZ + y;

        if (
          checkX >= 0 && checkX < this.data.width &&
          checkY >= 0 && checkY < this.data.height
        ) {
          if (this.data.grid[0][checkY][checkX] === CellType.WALL) {
            const wallMinX = checkX * DungeonMap.CELL_SIZE;
            const wallMaxX = wallMinX + DungeonMap.CELL_SIZE;
            const wallMinZ = checkY * DungeonMap.CELL_SIZE;
            const wallMaxZ = wallMinZ + DungeonMap.CELL_SIZE;

            if (
              position.x + radius > wallMinX && position.x - radius < wallMaxX &&
              position.z + radius > wallMinZ && position.z - radius < wallMaxZ
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * 清理资源
   */
  dispose() {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
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
