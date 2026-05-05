import * as THREE from 'three';
import { DungeonGenerator, CellType } from './DungeonGenerator.js';
import { Monster } from '../entities/Monster.js';
import { Chest } from '../entities/Chest.js';

/**
 * 古墓地图类
 * 负责将生成的网格数据转换为3D场景 - 改造为明亮的古代宫殿风格
 */
export class DungeonMap {
  data;
  mesh;
  monsters = [];
  chests = [];
  evacuationZone = null;
  collisionBounds = [];

  static CELL_SIZE = 3; // 每个网格单元3米 - 更宽敞
  static WALL_HEIGHT = 4; // 墙高4米

  constructor(seed) {
    const generator = new DungeonGenerator(30, 30, 1, seed);
    this.data = generator.generate();
    this.mesh = new THREE.Group();
    this.buildMesh();
    this.spawnEntities();
  }

  /**
   * 构建3D场景 - 古代宫殿风格
   */
  buildMesh() {
    // 创建材质 - 古代石材质感
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8a88a,
      roughness: 0.8,
      metalness: 0.0,
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xa09070,
      roughness: 0.9,
      metalness: 0.05,
    });

    const floorPatternMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.85,
      metalness: 0.05,
    });

    const wallTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a8a6a,
      roughness: 0.7,
      metalness: 0.05,
    });

    const columnMaterial = new THREE.MeshStandardMaterial({
      color: 0xc4b59a,
      roughness: 0.6,
      metalness: 0.1,
    });

    const wallInstances = [];
    const floorInstances = [];
    const floorPatternInstances = [];
    const columnInstances = [];
    const wallTopInstances = [];

    for (let d = 0; d < this.data.depth; d++) {
      for (let y = 0; y < this.data.height; y++) {
        for (let x = 0; x < this.data.width; x++) {
          const cell = this.data.grid[d][y][x];
          const posX = x * DungeonMap.CELL_SIZE;
          const posY = d * DungeonMap.CELL_SIZE;
          const posZ = y * DungeonMap.CELL_SIZE;

          if (cell === CellType.WALL) {
            // 主墙体
            const wallMatrix = new THREE.Matrix4();
            wallMatrix.compose(
              new THREE.Vector3(posX, posY + DungeonMap.WALL_HEIGHT / 2, posZ),
              new THREE.Quaternion(),
              new THREE.Vector3(DungeonMap.CELL_SIZE, DungeonMap.WALL_HEIGHT, DungeonMap.CELL_SIZE)
            );
            wallInstances.push(wallMatrix);

            // 墙顶装饰
            const topMatrix = new THREE.Matrix4();
            topMatrix.compose(
              new THREE.Vector3(posX, posY + DungeonMap.WALL_HEIGHT + 0.2, posZ),
              new THREE.Quaternion(),
              new THREE.Vector3(DungeonMap.CELL_SIZE + 0.2, 0.4, DungeonMap.CELL_SIZE + 0.2)
            );
            wallTopInstances.push(topMatrix);

            // 如果是外墙，添加柱子装饰
            if (this.isOuterWall(x, y)) {
              const colMatrix = new THREE.Matrix4();
              colMatrix.compose(
                new THREE.Vector3(posX, posY + DungeonMap.WALL_HEIGHT / 2 + 1, posZ),
                new THREE.Quaternion(),
                new THREE.Vector3(0.4, 2, 0.4)
              );
              columnInstances.push(colMatrix);
            }
          } else if (cell === CellType.FLOOR) {
            // 主地板 - 棋盘格效果
            const material = (x + y) % 2 === 0 ? floorMaterial : floorPatternMaterial;
            const matrix = new THREE.Matrix4();
            matrix.compose(
              new THREE.Vector3(posX, posY, posZ),
              new THREE.Quaternion(),
              new THREE.Vector3(DungeonMap.CELL_SIZE, 0.3, DungeonMap.CELL_SIZE)
            );
            
            if ((x + y) % 2 === 0) {
              floorInstances.push(matrix);
            } else {
              floorPatternInstances.push(matrix);
            }

            // 天花板
            const ceilMatrix = new THREE.Matrix4();
            ceilMatrix.compose(
              new THREE.Vector3(posX, posY + DungeonMap.WALL_HEIGHT + 1, posZ),
              new THREE.Quaternion(),
              new THREE.Vector3(DungeonMap.CELL_SIZE, 0.3, DungeonMap.CELL_SIZE)
            );
            floorInstances.push(ceilMatrix);
          }
        }
      }
    }

    // 创建InstancedMesh
    const geometry = new THREE.BoxGeometry(1, 1, 1);

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

    if (floorPatternInstances.length > 0) {
      const patternMesh = new THREE.InstancedMesh(geometry, floorPatternMaterial, floorPatternInstances.length);
      floorPatternInstances.forEach((matrix, i) => patternMesh.setMatrixAt(i, matrix));
      patternMesh.receiveShadow = true;
      this.mesh.add(patternMesh);
    }

    if (wallTopInstances.length > 0) {
      const topMesh = new THREE.InstancedMesh(geometry, wallTopMaterial, wallTopInstances.length);
      wallTopInstances.forEach((matrix, i) => topMesh.setMatrixAt(i, matrix));
      topMesh.castShadow = true;
      this.mesh.add(topMesh);
    }

    // 添加环境装饰
    this.addDecorations();

    // 添加火把照明
    this.addTorches();

    // 创建撤离点标记
    this.createEvacuationZone();
  }

  /**
   * 判断是否为外墙
   */
  isOuterWall(x, y) {
    // 检查周围是否有地板
    let hasFloor = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.data.width && ny >= 0 && ny < this.data.height) {
          if (this.data.grid[0][ny][nx] === CellType.FLOOR) {
            hasFloor = true;
          }
        }
      }
    }
    return hasFloor;
  }

  /**
   * 添加环境装饰物
   */
  addDecorations() {
    const roomCenters = [];
    
    // 找到每个房间中心
    for (const room of this.data.rooms) {
      const center = new THREE.Vector3(
        (room.x + room.width / 2) * DungeonMap.CELL_SIZE,
        0,
        (room.y + room.height / 2) * DungeonMap.CELL_SIZE
      );
      roomCenters.push(center);
    }

    // 在房间中心添加装饰
    roomCenters.forEach((center, index) => {
      // 中央石台
      if (index % 2 === 0) {
        const pedestalGeo = new THREE.BoxGeometry(1.5, 0.8, 1.5);
        const pedestalMat = new THREE.MeshStandardMaterial({
          color: 0x8b7355,
          roughness: 0.7,
        });
        const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
        pedestal.position.set(center.x, 0.4, center.z);
        pedestal.castShadow = true;
        this.mesh.add(pedestal);
      }

      // 古代花瓶
      if (index % 3 === 0) {
        const vaseGeo = new THREE.CylinderGeometry(0.3, 0.15, 1.2, 8);
        const vaseMat = new THREE.MeshStandardMaterial({
          color: 0xcd853f,
          roughness: 0.5,
        });
        const vase = new THREE.Mesh(vaseGeo, vaseMat);
        vase.position.set(center.x + 2, 0.6, center.z + 2);
        vase.castShadow = true;
        this.mesh.add(vase);
      }

      // 角落雕像
      if (index % 4 === 0) {
        const statueBaseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.5, 6);
        const statueBaseMat = new THREE.MeshStandardMaterial({ color: 0x9a8a6a });
        const statueBase = new THREE.Mesh(statueBaseGeo, statueBaseMat);
        statueBase.position.set(center.x - 3, 0.25, center.z - 3);
        this.mesh.add(statueBase);

        const statueBodyGeo = new THREE.CylinderGeometry(0.25, 0.4, 2, 6);
        const statueBodyMat = new THREE.MeshStandardMaterial({ color: 0xb8a88a });
        const statueBody = new THREE.Mesh(statueBodyGeo, statueBodyMat);
        statueBody.position.set(center.x - 3, 1.5, center.z - 3);
        statueBody.castShadow = true;
        this.mesh.add(statueBody);
      }
    });
  }

  /**
   * 添加火把照明
   */
  addTorches() {
    const torchPositions = [];
    
    // 沿走廊和房间墙壁放置火把
    for (let y = 0; y < this.data.height; y += 4) {
      for (let x = 0; x < this.data.width; x += 4) {
        if (this.data.grid[0][y][x] === CellType.WALL) {
          // 检查旁边的地板
          if ((x + 1 < this.data.width && this.data.grid[0][y][x + 1] === CellType.FLOOR) ||
              (x - 1 >= 0 && this.data.grid[0][y][x - 1] === CellType.FLOOR) ||
              (y + 1 < this.data.height && this.data.grid[0][y + 1][x] === CellType.FLOOR) ||
              (y - 1 >= 0 && this.data.grid[0][y - 1][x] === CellType.FLOOR)) {
            torchPositions.push(new THREE.Vector3(
              x * DungeonMap.CELL_SIZE,
              DungeonMap.WALL_HEIGHT - 0.5,
              y * DungeonMap.CELL_SIZE
            ));
          }
        }
      }
    }

    // 最多放置20个火把
    const selectedPositions = torchPositions.slice(0, 20);
    
    selectedPositions.forEach((pos) => {
      // 火把棍子
      const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 4);
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.copy(pos);
      stick.rotation.z = Math.PI / 6;
      this.mesh.add(stick);

      // 火焰
      const flameGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8,
      });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(pos.x, pos.y + 0.3, pos.z);
      this.mesh.add(flame);

      // 火光
      const light = new THREE.PointLight(0xff8800, 2, 15);
      light.position.set(pos.x, pos.y + 0.2, pos.z);
      this.mesh.add(light);
    });
  }

  /**
   * 创建撤离点标记
   */
  createEvacuationZone() {
    const evacPos = this.data.evacuationPoint.clone().multiplyScalar(DungeonMap.CELL_SIZE);
    evacPos.y = 0.1;

    // 大型发光圆环
    const ringGeo = new THREE.RingGeometry(2, 3, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    this.evacuationZone = new THREE.Mesh(ringGeo, ringMat);
    this.evacuationZone.rotation.x = -Math.PI / 2;
    this.evacuationZone.position.copy(evacPos);
    this.mesh.add(this.evacuationZone);

    // 内部小圆环
    const innerRingGeo = new THREE.RingGeometry(0.5, 1.5, 32);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x88ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.copy(evacPos);
    innerRing.position.y = 0.15;
    this.mesh.add(innerRing);

    // 光柱效果
    const pillarGeo = new THREE.CylinderGeometry(0.5, 2, 6, 8, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(evacPos.x, 3, evacPos.z);
    this.mesh.add(pillar);

    // 强光源
    const light = new THREE.PointLight(0x00ff88, 5, 20);
    light.position.set(evacPos.x, 3, evacPos.z);
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
      this.evacuationZone.material.opacity = 0.4 + Math.sin(elapsedTime * 2) * 0.2;
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
    return dist < 4;
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
   * 获取宝箱
   */
  getChests() {
    return this.chests;
  }

  /**
   * 获取怪物
   */
  getMonsters() {
    return this.monsters;
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
