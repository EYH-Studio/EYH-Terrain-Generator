class TerrainRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = null;
    this.showWireframe = false;
    this.showContours = false;
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      if (!this.canvas) {
        console.warn("Canvas element not found");
        return;
      }

      this.ctx = this.canvas.getContext("2d");

      if (!this.ctx) {
        throw new Error("2D Canvas context not supported");
      }

      // Set canvas size
      this.canvas.width = 512;
      this.canvas.height = 512;

      // Clear with a dark background
      this.ctx.fillStyle = "#1a1a3a";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Add ready message
      this.ctx.fillStyle = "#00ff88";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "Canvas Ready - Generate Terrain",
        this.canvas.width / 2,
        this.canvas.height / 2
      );

      this.isInitialized = true;
      console.log("Canvas initialized successfully");
    } catch (error) {
      console.error("Canvas initialization failed:", error);
      this.isInitialized = false;
    }
  }

  render(heightmap, settings) {
    // Preview is optional - don't block export if preview fails
    if (!this.isInitialized || !heightmap) {
      console.log("Preview not available, but export will work");
      return;
    }

    try {
      const size = heightmap.length;
      const canvasSize = Math.min(this.canvas.width, this.canvas.height);

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Create image data
      const imageData = this.ctx.createImageData(canvasSize, canvasSize);
      const data = imageData.data;

      // Calculate height range
      let maxHeight = -Infinity;
      let minHeight = Infinity;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const height = heightmap[y][x];
          maxHeight = Math.max(maxHeight, height);
          minHeight = Math.min(minHeight, height);
        }
      }

      const heightRange = maxHeight - minHeight;

      // Render terrain
      for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
          const mapX = Math.floor((x / canvasSize) * size);
          const mapY = Math.floor((y / canvasSize) * size);

          const height =
            heightmap[mapY] && heightmap[mapY][mapX] !== undefined
              ? heightmap[mapY][mapX]
              : 0;

          const normalizedHeight =
            heightRange > 0 ? (height - minHeight) / heightRange : 0;
          const color = this.getColorForHeight(
            normalizedHeight,
            height,
            settings.waterLevel || 50
          );

          const index = (y * canvasSize + x) * 4;
          data[index] = color.r;
          data[index + 1] = color.g;
          data[index + 2] = color.b;
          data[index + 3] = 255;
        }
      }

      this.ctx.putImageData(imageData, 0, 0);

      // Add overlays
      if (this.showWireframe) {
        this.drawWireframe(heightmap, canvasSize);
      }

      if (this.showContours) {
        this.drawContours(heightmap, canvasSize, maxHeight, minHeight);
      }
    } catch (error) {
      console.error("Render error:", error);
      // Show error on canvas
      this.ctx.fillStyle = "#ff6b6b";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = "white";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        "Preview Error",
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }
  }

  getColorForHeight(normalizedHeight, actualHeight, waterLevel) {
    // Water detection
    if (actualHeight <= waterLevel) {
      const depth = Math.max(0, Math.min(1, (waterLevel - actualHeight) / 100));
      return {
        r: Math.round(20 + depth * 30),
        g: Math.round(80 + depth * 70),
        b: Math.round(180 + depth * 75),
      };
    }

    // Terrain colors
    if (normalizedHeight < 0.1) {
      return { r: 194, g: 178, b: 128 }; // Beach
    } else if (normalizedHeight < 0.3) {
      return { r: 34, g: 139, b: 34 }; // Lowlands
    } else if (normalizedHeight < 0.5) {
      return { r: 50, g: 160, b: 50 }; // Hills
    } else if (normalizedHeight < 0.7) {
      return { r: 107, g: 142, b: 35 }; // Highlands
    } else if (normalizedHeight < 0.85) {
      return { r: 139, g: 119, b: 101 }; // Mountains
    } else {
      return { r: 220, g: 220, b: 220 }; // Peaks
    }
  }

  drawWireframe(heightmap, canvasSize) {
    if (!this.ctx) return;

    const size = heightmap.length;
    const step = Math.max(1, Math.floor(size / 30));

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    this.ctx.lineWidth = 0.5;
    this.ctx.beginPath();

    for (let x = 0; x < size; x += step) {
      const canvasX = (x / size) * canvasSize;
      this.ctx.moveTo(canvasX, 0);
      this.ctx.lineTo(canvasX, canvasSize);
    }

    for (let y = 0; y < size; y += step) {
      const canvasY = (y / size) * canvasSize;
      this.ctx.moveTo(0, canvasY);
      this.ctx.lineTo(canvasSize, canvasY);
    }

    this.ctx.stroke();
  }

  drawContours(heightmap, canvasSize, maxHeight, minHeight) {
    if (!this.ctx) return;

    const size = heightmap.length;
    const heightStep = (maxHeight - minHeight) / 12;

    this.ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";
    this.ctx.lineWidth = 1;

    for (let level = 1; level < 12; level++) {
      const contourHeight = minHeight + level * heightStep;
      this.drawContourLine(heightmap, canvasSize, contourHeight);
    }
  }

  drawContourLine(heightmap, canvasSize, contourHeight) {
    if (!this.ctx) return;

    const size = heightmap.length;
    this.ctx.beginPath();

    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const h1 = heightmap[y][x];
        const h2 = heightmap[y][x + 1] || h1;
        const h3 = heightmap[y + 1][x] || h1;

        if (
          (h1 <= contourHeight && (h2 > contourHeight || h3 > contourHeight)) ||
          (h1 > contourHeight && (h2 <= contourHeight || h3 <= contourHeight))
        ) {
          const canvasX = (x / size) * canvasSize;
          const canvasY = (y / size) * canvasSize;

          this.ctx.rect(canvasX, canvasY, 2, 2);
        }
      }
    }

    this.ctx.fill();
  }

  setWireframe(enabled) {
    this.showWireframe = enabled;
  }

  setContours(enabled) {
    this.showContours = enabled;
  }
}
