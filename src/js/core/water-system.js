class WaterSystem {
  constructor() {
    this.waterMask = null;
  }

  applyWater(heightmap, settings) {
    const { waterType, waterLevel } = settings;

    if (waterType === "none") {
      return heightmap;
    }

    const size = heightmap.length;
    const modifiedHeightmap = heightmap.map((row) => [...row]);

    try {
      switch (waterType) {
        case "lake":
          this.createLake(modifiedHeightmap, size, waterLevel);
          break;
        case "river":
          this.createRiver(modifiedHeightmap, size, waterLevel);
          break;
        case "ocean":
          this.createOcean(modifiedHeightmap, size, waterLevel);
          break;
      }
    } catch (error) {
      console.error("Water system error:", error);
    }

    return modifiedHeightmap;
  }

  createLake(heightmap, size, waterLevel) {
    const centerX = size * 0.5;
    const centerY = size * 0.5;
    const radius = size * 0.25;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (dist < radius) {
          const factor = Math.max(0, 1 - dist / radius);
          const lakeDepth = waterLevel * factor * 0.5;
          heightmap[y][x] = Math.min(
            heightmap[y][x],
            Math.max(0, waterLevel - lakeDepth)
          );
        }
      }
    }
  }

  createRiver(heightmap, size, waterLevel) {
    const riverWidth = size * 0.05;

    for (let y = 0; y < size; y++) {
      const riverX =
        size * 0.3 + Math.sin((y / size) * Math.PI * 3) * size * 0.2;

      for (let x = 0; x < size; x++) {
        const distFromRiver = Math.abs(x - riverX);
        if (distFromRiver < riverWidth) {
          const factor = Math.max(0, 1 - distFromRiver / riverWidth);
          const riverDepth = waterLevel * factor * 0.8;
          heightmap[y][x] = Math.min(
            heightmap[y][x],
            Math.max(0, waterLevel - riverDepth)
          );
        }
      }
    }
  }

  createOcean(heightmap, size, waterLevel) {
    const oceanDepth = size * 0.2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < oceanDepth; x++) {
        const factor = Math.max(0, 1 - x / oceanDepth);
        const depth = waterLevel * factor;
        heightmap[y][x] = Math.max(0, waterLevel - depth);
      }
    }
  }

  generateWaterMask(heightmap, waterLevel) {
    const size = heightmap.length;
    this.waterMask = [];

    for (let y = 0; y < size; y++) {
      this.waterMask[y] = [];
      for (let x = 0; x < size; x++) {
        this.waterMask[y][x] = heightmap[y][x] <= waterLevel;
      }
    }

    return this.waterMask;
  }
}
