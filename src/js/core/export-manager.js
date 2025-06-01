class ExportManager {
  constructor() {
    this.heightmap = null;
  }

  setHeightmap(heightmap) {
    this.heightmap = heightmap;
  }

  exportRAW() {
    if (!this.heightmap) {
      throw new Error("No heightmap to export");
    }

    try {
      const size = this.heightmap.length;
      const buffer = new ArrayBuffer(size * size * 2); // 16-bit
      const view = new Uint16Array(buffer);

      // Find min and max for normalization
      let min = Infinity;
      let max = -Infinity;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const height = this.heightmap[y][x];
          min = Math.min(min, height);
          max = Math.max(max, height);
        }
      }

      const range = max - min;

      // Convert to 16-bit values
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const height = this.heightmap[y][x];
          const normalized = range > 0 ? (height - min) / range : 0;
          const value = Math.round(normalized * 65535);
          view[y * size + x] = Math.max(0, Math.min(65535, value));
        }
      }

      // Create and download
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      this.downloadBlob(
        blob,
        `unity_terrain_${size}x${size}_${Date.now()}.raw`
      );
    } catch (error) {
      console.error("RAW export error:", error);
      throw error;
    }
  }

  exportPNG() {
    if (!this.heightmap) {
      throw new Error("No heightmap to export");
    }

    try {
      const size = this.heightmap.length;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      const imageData = ctx.createImageData(size, size);
      const data = imageData.data;

      // Find min and max for normalization
      let min = Infinity;
      let max = -Infinity;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const height = this.heightmap[y][x];
          min = Math.min(min, height);
          max = Math.max(max, height);
        }
      }

      const range = max - min;

      // Convert to grayscale
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const height = this.heightmap[y][x];
          const normalized = range > 0 ? (height - min) / range : 0;
          const value = Math.round(normalized * 255);

          const index = (y * size + x) * 4;
          data[index] = value; // Red
          data[index + 1] = value; // Green
          data[index + 2] = value; // Blue
          data[index + 3] = 255; // Alpha
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        this.downloadBlob(blob, `heightmap_${size}x${size}_${Date.now()}.png`);
      }, "image/png");
    } catch (error) {
      console.error("PNG export error:", error);
      throw error;
    }
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
