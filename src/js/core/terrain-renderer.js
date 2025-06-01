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
        throw new Error("Canvas element not found");
      }

      this.ctx = this.canvas.getContext("2d");

      if (!this.ctx) {
        throw new Error("2D Canvas context not supported");
      }

      // Set canvas size properly
      this.canvas.width = 512;
      this.canvas.height = 512;
      this.canvas.style.width = "512px";
      this.canvas.style.height = "512px";

      // Initial clear
      this.showInitialMessage();

      this.isInitialized = true;
      console.log("Canvas initialized successfully");
    } catch (error) {
      console.error("Canvas initialization failed:", error);
      this.isInitialized = false;
    }
  }

  showInitialMessage() {
    // Clear with dark background
    this.ctx.fillStyle = "#1a1a3a";
    this.ctx.fillRect(0, 0, 512, 512);

    // Show ready message
    this.ctx.fillStyle = "#00ff88";
    this.ctx.font = "18px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("Ready - Generate Terrain", 256, 256);
  }

  render(heightmap, settings) {
    if (!this.isInitialized || !heightmap || !this.ctx) {
      console.log("Preview not available");
      return;
    }

    try {
      const size = heightmap.length;
      const canvasSize = 512;

      console.log(
        `Rendering heightmap: ${size}x${size} to ${canvasSize}x${canvasSize}`
      );

      // Clear canvas first
      this.ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Create image data
      const imageData = this.ctx.createImageData(canvasSize, canvasSize);
      const data = imageData.data;

      // Find height range for normalization
      let maxHeight = -Infinity;
      let minHeight = Infinity;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const height = heightmap[y][x];
          if (height !== undefined && height !== null) {
            maxHeight = Math.max(maxHeight, height);
            minHeight = Math.min(minHeight, height);
          }
        }
      }

      const heightRange = maxHeight - minHeight;
      console.log(
        `Height range: ${minHeight.toFixed(1)} - ${maxHeight.toFixed(1)}`
      );

      // Render each pixel
      for (let canvasY = 0; canvasY < canvasSize; canvasY++) {
        for (let canvasX = 0; canvasX < canvasSize; canvasX++) {
          // Map canvas coordinates to heightmap coordinates
          const heightmapX = Math.floor((canvasX / canvasSize) * size);
          const heightmapY = Math.floor((canvasY / canvasSize) * size);

          // Get height value
          const height =
            heightmap[heightmapY] &&
            heightmap[heightmapY][heightmapX] !== undefined
              ? heightmap[heightmapY][heightmapX]
              : minHeight;

          // Normalize height to 0-1 range
          const normalizedHeight =
            heightRange > 0
              ? Math.max(0, Math.min(1, (height - minHeight) / heightRange))
              : 0;

          // Get color for this height
          const color = this.getColorForHeight(
            normalizedHeight,
            height,
            settings
          );

          // Set pixel data
          const pixelIndex = (canvasY * canvasSize + canvasX) * 4;
          data[pixelIndex] = color.r;
          data[pixelIndex + 1] = color.g;
          data[pixelIndex + 2] = color.b;
          data[pixelIndex + 3] = 255; // Alpha
        }
      }

      // Draw the image data to canvas
      this.ctx.putImageData(imageData, 0, 0);

      // Add overlays if enabled
      if (this.showWireframe) {
        this.drawWireframe(heightmap, canvasSize);
      }

      if (this.showContours) {
        this.drawContours(heightmap, canvasSize, maxHeight, minHeight);
      }

      console.log("Rendering completed successfully");
    } catch (error) {
      console.error("Render error:", error);

      // Show error state
      this.ctx.fillStyle = "#ff3333";
      this.ctx.fillRect(0, 0, 512, 512);
      this.ctx.fillStyle = "white";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("Render Error", 256, 256);
    }
  }

  getColorForHeight(normalizedHeight, actualHeight, settings) {
    // Check if water should be applied
    const hasWater = settings.waterType && settings.waterType !== "none";
    const waterLevel = settings.waterLevel || 0;

    // FIXED: Only show water if water is enabled AND height is below water level
    if (hasWater && actualHeight <= waterLevel && waterLevel > 0) {
      const depth = Math.max(
        0,
        Math.min(1, (waterLevel - actualHeight) / Math.max(1, waterLevel * 0.5))
      );
      return {
        r: Math.round(30 + depth * 40),
        g: Math.round(100 + depth * 80),
        b: Math.round(200 + depth * 55),
      };
    }

    // FIXED: Terrain colors without blue tints
    const h = Math.max(0, Math.min(1, normalizedHeight));

    if (h < 0.1) {
      // Very low - dark green
      return { r: 34, g: 85, b: 34 };
    } else if (h < 0.25) {
      // Low - green
      return { r: 51, g: 102, b: 51 };
    } else if (h < 0.4) {
      // Medium low - forest green
      return { r: 68, g: 119, b: 68 };
    } else if (h < 0.55) {
      // Medium - olive
      return { r: 85, g: 119, b: 51 };
    } else if (h < 0.7) {
      // High - yellow-brown
      return { r: 136, g: 119, b: 68 };
    } else if (h < 0.85) {
      // Very high - brown
      return { r: 119, g: 85, b: 68 };
    } else {
      // Peak - light gray
      return { r: 170, g: 170, b: 170 };
    }
  }

  drawWireframe(heightmap, canvasSize) {
    const size = heightmap.length;
    const step = Math.max(1, Math.floor(size / 20)); // Grid lines

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    // Vertical lines
    for (let x = 0; x < size; x += step) {
      const canvasX = (x / size) * canvasSize;
      this.ctx.moveTo(canvasX, 0);
      this.ctx.lineTo(canvasX, canvasSize);
    }

    // Horizontal lines
    for (let y = 0; y < size; y += step) {
      const canvasY = (y / size) * canvasSize;
      this.ctx.moveTo(0, canvasY);
      this.ctx.lineTo(canvasSize, canvasY);
    }

    this.ctx.stroke();
  }

  drawContours(heightmap, canvasSize, maxHeight, minHeight) {
    const size = heightmap.length;
    const heightStep = (maxHeight - minHeight) / 8; // 8 contour levels

    this.ctx.strokeStyle = "rgba(255, 255, 0, 0.8)";
    this.ctx.lineWidth = 1;

    for (let level = 1; level < 8; level++) {
      const contourHeight = minHeight + level * heightStep;
      this.drawContourLine(heightmap, canvasSize, contourHeight);
    }
  }

  drawContourLine(heightmap, canvasSize, contourHeight) {
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

          this.ctx.moveTo(canvasX, canvasY);
          this.ctx.lineTo(canvasX + 1, canvasY + 1);
        }
      }
    }

    this.ctx.stroke();
  }

  setWireframe(enabled) {
    this.showWireframe = enabled;
  }

  setContours(enabled) {
    this.showContours = enabled;
  }
}
