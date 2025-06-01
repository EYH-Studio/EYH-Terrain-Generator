class TerrainGenerator {
  constructor() {
    this.noise = null;
    this.heightmap = null;
    this.settings = {};
  }

  generate(settings) {
    try {
      this.settings = this.optimizeSettingsForUnity(settings);
      this.noise = new PerlinNoise(this.settings.seed);

      const size = parseInt(this.settings.size);
      this.heightmap = this.createHeightmap(size);

      return this.heightmap;
    } catch (error) {
      console.error("TerrainGenerator error:", error);
      throw error;
    }
  }

  optimizeSettingsForUnity(settings) {
    // Unity-friendly parameter optimization
    return {
      ...settings,
      // Daha yumuşak terrain için scale'i azalt
      scale: Math.max(0.002, Math.min(0.02, settings.scale)),
      // Octave'leri sınırla (çok detay Unity'de problem yaratır)
      octaves: Math.max(3, Math.min(6, settings.octaves)),
      // Persistence'ı düşük tut (yumuşak geçişler için)
      persistence: Math.max(0.3, Math.min(0.7, settings.persistence)),
      // Lacunarity'yi sınırla
      lacunarity: Math.max(1.5, Math.min(2.5, settings.lacunarity)),
      // Height'ı Unity için optimize et
      maxHeight: Math.max(50, Math.min(500, settings.maxHeight)),
      // Contrast'ı hafif tut
      contrast: Math.max(0.8, Math.min(1.5, settings.contrast)),
    };
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

        // Terrain type modifier
        height = this.applyTerrainType(height, terrainType, x, y, size);

        // Unity-friendly height distribution
        height = this.applyUnityHeightDistribution(height);

        // Apply contrast (hafif)
        height = Math.pow(Math.max(0, Math.min(1, height)), contrast);

        // Final height calculation
        height = height * maxHeight;

        heightmap[y][x] = Math.max(0, height);
      }
    }

    // Always apply smoothing for Unity
    return this.smoothTerrain(heightmap, this.settings.smoothing || 2);
  }

  calculateHeight(x, y, size) {
    const { scale, octaves, persistence, lacunarity } = this.settings;

    try {
      // Base noise
      let height = this.noise.octaveNoise(
        x * scale,
        y * scale,
        octaves,
        persistence,
        lacunarity
      );

      // Edge falloff for more natural terrain
      const edgeFalloff = this.calculateEdgeFalloff(x, y, size);
      height *= edgeFalloff;

      // Normalize to 0-1
      return Math.max(0, Math.min(1, (height + 1) * 0.5));
    } catch (error) {
      console.error("Height calculation error:", error);
      return 0.3; // Safe default
    }
  }

  calculateEdgeFalloff(x, y, size) {
    const center = size * 0.5;
    const maxDist = center * 0.9; // 90% of terrain has full height

    const distFromCenter = Math.sqrt((x - center) ** 2 + (y - center) ** 2);

    if (distFromCenter < maxDist) {
      return 1.0;
    } else {
      const falloffDistance = center - maxDist;
      const falloff =
        1.0 - Math.min(1.0, (distFromCenter - maxDist) / falloffDistance);
      return Math.max(0.1, falloff); // Minimum %10 height at edges
    }
  }

  applyUnityHeightDistribution(height) {
    // Unity için daha doğal yükseklik dağılımı
    // Çoğu alan düşük, az alan yüksek olacak şekilde

    if (height < 0.3) {
      // Düşük alanlar (çayırlar, vadiler)
      return height * 0.4;
    } else if (height < 0.6) {
      // Orta yükseklik (tepeler)
      return 0.12 + (height - 0.3) * 0.6;
    } else if (height < 0.8) {
      // Yüksek alanlar (dağlar)
      return 0.3 + (height - 0.6) * 0.8;
    } else {
      // En yüksek zirveler
      return 0.46 + (height - 0.8) * 1.2;
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
          // Çok düz ve yumuşak
          return height * 0.25 + 0.05;

        case "hills":
          // Yumuşak tepeler
          const hillNoise = this.noise.octaveNoise(
            x * 0.008,
            y * 0.008,
            2,
            0.4,
            1.6
          );
          return height * 0.4 + Math.abs(hillNoise) * 0.15;

        case "mountains":
          // Daha belirgin ama yumuşak dağlar
          const ridgeNoise = this.noise.ridgedNoise(x * 0.004, y * 0.004, 3);
          return height * 0.6 + ridgeNoise * 0.25;

        case "desert":
          // Yumuşak kum tepeleri
          const duneNoise1 = this.noise.octaveNoise(
            x * 0.006,
            y * 0.006,
            2,
            0.5,
            1.8
          );
          const duneNoise2 = this.noise.octaveNoise(
            x * 0.012,
            y * 0.012,
            2,
            0.3,
            1.6
          );
          return (
            height * 0.3 + (Math.abs(duneNoise1) + Math.abs(duneNoise2)) * 0.08
          );

        case "islands":
          // Adalar - kenarlar suya doğru düşük
          return height * edgeFactor * 0.5;

        case "valleys":
          // Vadiler ve yüksek tepeler
          const valleyNoise = this.noise.octaveNoise(
            x * 0.002,
            y * 0.002,
            2,
            0.6,
            2.0
          );
          return height * 0.4 + Math.sin(valleyNoise * Math.PI) * 0.15;

        default:
          return height * 0.6;
      }
    } catch (error) {
      console.error("Terrain type error:", error);
      return height * 0.6;
    }
  }

  smoothTerrain(heightmap, iterations) {
    const size = heightmap.length;
    let smoothed = heightmap.map((row) => [...row]);

    // Unity için çok önemli - her zaman smooth uygula
    const smoothIterations = Math.max(1, Math.min(3, iterations));

    for (let iter = 0; iter < smoothIterations; iter++) {
      const newHeightmap = smoothed.map((row) => [...row]);

      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          let sum = 0;
          let count = 0;

          // 3x3 kernel smoothing
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const weight = dx === 0 && dy === 0 ? 4 : 1; // Center pixel has more weight
              sum += smoothed[y + dy][x + dx] * weight;
              count += weight;
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
