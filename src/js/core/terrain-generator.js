class TerrainGenerator {
  constructor() {
    this.noise = null;
    this.heightmap = null;
    this.settings = {};
  }

  generate(settings) {
    try {
      this.settings = settings;
      this.noise = new PerlinNoise(settings.seed);

      const size = parseInt(settings.size);
      this.heightmap = this.createHeightmap(size);

      return this.heightmap;
    } catch (error) {
      console.error("TerrainGenerator error:", error);
      throw error;
    }
  }

  createHeightmap(size) {
    const heightmap = [];
    const {
      scale,
      octaves,
      persistence,
      lacunarity,
      terrainType,
      maxHeight,
      contrast,
    } = this.settings;

    for (let y = 0; y < size; y++) {
      heightmap[y] = [];
      for (let x = 0; x < size; x++) {
        let height = this.calculateHeight(x, y, size);

        // Apply terrain type modifier
        height = this.applyTerrainType(height, terrainType, x, y, size);

        // Apply contrast
        height = Math.pow(Math.max(0, Math.min(1, height)), contrast);

        // Convert to final height
        height = height * maxHeight;

        heightmap[y][x] = Math.max(0, height);
      }
    }

    // Apply smoothing if requested
    if (this.settings.smoothing > 0) {
      return this.smoothTerrain(heightmap, this.settings.smoothing);
    }

    return heightmap;
  }

  calculateHeight(x, y, size) {
    const { scale, octaves, persistence, lacunarity } = this.settings;

    try {
      let height = this.noise.octaveNoise(
        x * scale,
        y * scale,
        Math.min(octaves, 8), // Limit octaves to prevent stack overflow
        Math.max(0.1, Math.min(1.0, persistence)), // Clamp values
        Math.max(1.5, Math.min(4.0, lacunarity))
      );

      // Normalize to 0-1
      return Math.max(0, Math.min(1, (height + 1) * 0.5));
    } catch (error) {
      console.error("Height calculation error:", error);
      return 0.5; // Default height
    }
  }

  applyTerrainType(height, type, x, y, size) {
    const centerX = size * 0.5;
    const centerY = size * 0.5;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const edgeFactor = Math.max(0, Math.min(1, 1 - distFromCenter / maxDist));

    try {
      switch (type) {
        case "plains":
          return height * 0.3 + 0.1;

        case "hills":
          const hillNoise = this.noise.octaveNoise(
            x * 0.01,
            y * 0.01,
            3,
            0.5,
            1.8
          );
          return height * 0.6 + Math.abs(hillNoise) * 0.2;

        case "mountains":
          const ridgeNoise = this.noise.ridgedNoise(x * 0.005, y * 0.005, 4);
          return height * 0.7 + ridgeNoise * 0.3;

        case "desert":
          const duneNoise1 = this.noise.octaveNoise(
            x * 0.008,
            y * 0.008,
            3,
            0.6,
            2.2
          );
          const duneNoise2 = this.noise.octaveNoise(
            x * 0.015,
            y * 0.015,
            2,
            0.4,
            1.8
          );
          return (
            height * 0.4 + (Math.abs(duneNoise1) + Math.abs(duneNoise2)) * 0.1
          );

        case "islands":
          return height * edgeFactor * 0.8;

        case "valleys":
          const valleyNoise = this.noise.octaveNoise(
            x * 0.003,
            y * 0.003,
            2,
            0.7,
            2.0
          );
          return height * 0.5 + Math.sin(valleyNoise * Math.PI) * 0.2;

        default:
          return height;
      }
    } catch (error) {
      console.error("Terrain type error:", error);
      return height; // Return unmodified height on error
    }
  }

  smoothTerrain(heightmap, iterations) {
    const size = heightmap.length;
    let smoothed = heightmap.map((row) => [...row]);

    for (let iter = 0; iter < Math.min(iterations, 3); iter++) {
      // Limit iterations
      const newHeightmap = smoothed.map((row) => [...row]);

      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          let sum = 0;
          let count = 0;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += smoothed[y + dy][x + dx];
              count++;
            }
          }

          newHeightmap[y][x] = sum / count;
        }
      }

      smoothed = newHeightmap;
    }

    return smoothed;
  }

  getHeightmapStats() {
    if (!this.heightmap) return null;

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;

    for (let y = 0; y < this.heightmap.length; y++) {
      for (let x = 0; x < this.heightmap[y].length; x++) {
        const height = this.heightmap[y][x];
        min = Math.min(min, height);
        max = Math.max(max, height);
        sum += height;
        count++;
      }
    }

    return {
      min: min.toFixed(1),
      max: max.toFixed(1),
      avg: (sum / count).toFixed(1),
      size: this.heightmap.length,
    };
  }
}
