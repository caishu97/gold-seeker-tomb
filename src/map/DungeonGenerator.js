import * as THREE from 'three';

/**
 * 古墓地图生成器
 * 使用基于网格的程序化生成算法，创建房间+走廊结构的古墓
 */
export class DungeonGenerator {
  width;
  height;
  depth; // 层数
  rooms = [];
  corridors = [];
  grid;
  rng;

  constructor(width = 50, height = 50, depth = 3, seed) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.rng = this.createSeededRandom(seed ?? Date.now());
    this.grid = this.initializeGrid();
  }

  /**
   * 生成古墓地图
   */
  generate(config) {
    this.rooms = [];
    this.corridors = [];
    this.grid = this.initializeGrid();

    const genConfig = {
      minRoomSize: 3,
      maxRoomSize: 8,
      roomCount: 8 + Math.floor(this.rng() * 8),
      monsterDensity: 0.3,
      chestDensity: 0.4,
      evacuationDifficulty: 'normal'
    };

    // 生成房间
    this.generateRooms(genConfig);

    // 连接房间
    this.connectRooms();

    // 生成特殊点位
    const spawnPoint = this.findSpawnPoint();
    const evacuationPoint = this.findEvacuationPoint(spawnPoint);
    const chestPoints = this.findChestPoints(genConfig.chestDensity);
    const monsterPoints = this.findMonsterPoints(genConfig.monsterDensity);

    return {
      width: this.width,
      height: this.height,
      depth: this.depth,
      grid: this.grid,
      rooms: this.rooms,
      corridors: this.corridors,
      spawnPoint,
      evacuationPoint,
      chestPoints,
      monsterPoints,
    };
  }

  /**
   * 初始化网格
   */
  initializeGrid() {
    const grid = [];
    for (let d = 0; d < this.depth; d++) {
      const layer = [];
      for (let y = 0; y < this.height; y++) {
        const row = [];
        for (let x = 0; x < this.width; x++) {
          row.push(CellType.WALL);
        }
        layer.push(row);
      }
      grid.push(layer);
    }
    return grid;
  }

  /**
   * 生成房间
   */
  generateRooms(config) {
    const attempts = 0;
    const maxAttempts = config.roomCount * 50;
    let createdRooms = 0;

    while (createdRooms < config.roomCount && attempts < maxAttempts) {
      const roomWidth = config.minRoomSize + Math.floor(this.rng() * (config.maxRoomSize - config.minRoomSize + 1));
      const roomHeight = config.minRoomSize + Math.floor(this.rng() * (config.maxRoomSize - config.minRoomSize + 1));
      const layer = Math.floor(this.rng() * this.depth);
      
      const x = Math.floor(this.rng() * (this.width - roomWidth - 2)) + 1;
      const y = Math.floor(this.rng() * (this.height - roomHeight - 2)) + 1;

      const newRoom = {
        x, y, z: layer,
        width: roomWidth,
        height: roomHeight,
        depth: 1,
        id: createdRooms,
      };

      if (this.canPlaceRoom(newRoom)) {
        this.placeRoom(newRoom);
        this.rooms.push(newRoom);
        createdRooms++;
      }
    }
  }

  /**
   * 检查是否可以放置房间
   */
  canPlaceRoom(room) {
    const padding = 2;
    for (let y = room.y - padding; y < room.y + room.height + padding; y++) {
      for (let x = room.x - padding; x < room.x + room.width + padding; x++) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        if (this.grid[room.z][y][x] !== CellType.WALL) return false;
      }
    }
    return true;
  }

  /**
   * 在网格中标记房间
   */
  placeRoom(room) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        this.grid[room.z][y][x] = CellType.FLOOR;
      }
    }
  }

  /**
   * 使用最小生成树连接房间
   */
  connectRooms() {
    if (this.rooms.length < 2) return;

    // 计算房间中心点
    const centers = this.rooms.map((room) => ({
      x: Math.floor(room.x + room.width / 2),
      y: Math.floor(room.y + room.height / 2),
      z: room.z,
      roomId: room.id,
    }));

    // 创建最小生成树
    const connected = new Set([0]);
    const edges = [];

    while (connected.size < centers.length) {
      let minDist = Infinity;
      let bestEdge = null;

      for (const fromId of connected) {
        for (let toId = 0; toId < centers.length; toId++) {
          if (connected.has(toId)) continue;
          const dist = this.distance(centers[fromId], centers[toId]);
          if (dist < minDist) {
            minDist = dist;
            bestEdge = { from: fromId, to: toId };
          }
        }
      }

      if (bestEdge) {
        const from = centers[bestEdge.from];
        const to = centers[bestEdge.to];
        this.createCorridor(from, to);
        connected.add(bestEdge.to);
      }
    }

    // 添加一些随机冗余连接
    for (let i = 0; i < this.rooms.length; i++) {
      if (this.rng() < 0.3) {
        const other = Math.floor(this.rng() * this.rooms.length);
        if (other !== i) {
          this.createCorridor(centers[i], centers[other]);
        }
      }
    }
  }

  /**
   * 创建走廊连接两点
   */
  createCorridor(from, to) {
    // L型走廊
    const midX = from.x;
    const midY = to.y;

    // 水平段
    const xStart = Math.min(from.x, midX);
    const xEnd = Math.max(from.x, midX);
    for (let x = xStart; x <= xEnd; x++) {
      if (from.z === to.z) {
        this.grid[from.z][from.y][x] = CellType.FLOOR;
        // 走廊宽度为2
        if (from.y + 1 < this.height) this.grid[from.z][from.y + 1][x] = CellType.FLOOR;
      }
    }

    // 垂直段
    const yStart = Math.min(from.y, to.y);
    const yEnd = Math.max(from.y, to.y);
    for (let y = yStart; y <= yEnd; y++) {
      if (from.z === to.z) {
        this.grid[to.z][y][to.x] = CellType.FLOOR;
        if (to.x + 1 < this.width) this.grid[to.z][y][to.x + 1] = CellType.FLOOR;
      }
    }

    // 跨层楼梯
    if (from.z !== to.z) {
      const minZ = Math.min(from.z, to.z);
      const maxZ = Math.max(from.z, to.z);
      for (let z = minZ; z <= maxZ; z++) {
        this.grid[z][from.y][from.x] = CellType.STAIR;
        this.grid[z][from.y + 1][from.x] = CellType.STAIR;
      }
    }

    this.corridors.push({ from, to });
  }

  /**
   * 寻找玩家出生点
   */
  findSpawnPoint() {
    const room = this.rooms[0];
    return new THREE.Vector3(
      room.x + Math.floor(room.width / 2),
      0,
      room.y + Math.floor(room.height / 2)
    );
  }

  /**
   * 寻找撤离点（远离出生点）
   */
  findEvacuationPoint(spawnPoint) {
    let bestRoom = this.rooms[this.rooms.length - 1];
    let maxDist = 0;

    for (const room of this.rooms) {
      const center = new THREE.Vector3(
        room.x + room.width / 2,
        0,
        room.y + room.height / 2
      );
      const dist = center.distanceTo(spawnPoint);
      if (dist > maxDist) {
        maxDist = dist;
        bestRoom = room;
      }
    }

    return new THREE.Vector3(
      bestRoom.x + Math.floor(bestRoom.width / 2),
      0,
      bestRoom.y + Math.floor(bestRoom.height / 2)
    );
  }

  /**
   * 寻找宝箱刷新点
   */
  findChestPoints(density) {
    const points = [];
    for (let d = 0; d < this.depth; d++) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[d][y][x] === CellType.FLOOR && this.rng() < density * 0.02) {
            points.push(new THREE.Vector3(x, 0, y));
          }
        }
      }
    }
    return points.slice(0, 10 + Math.floor(this.rng() * 10));
  }

  /**
   * 寻找怪物刷新点
   */
  findMonsterPoints(density) {
    const points = [];
    for (let d = 0; d < this.depth; d++) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[d][y][x] === CellType.FLOOR && this.rng() < density * 0.03) {
            points.push(new THREE.Vector3(x, 0, y));
          }
        }
      }
    }
    return points.slice(0, 5 + Math.floor(this.rng() * 15));
  }

  /**
   * 计算两点曼哈顿距离
   */
  distance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z) * 5;
  }

  /**
   * 简单的种子随机数生成器
   */
  createSeededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}

export const CellType = {
  WALL: 0,
  FLOOR: 1,
  STAIR: 2,
};
