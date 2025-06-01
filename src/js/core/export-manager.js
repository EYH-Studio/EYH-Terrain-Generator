class ExportManager {
  constructor() {
    this.heightmap = null;
    this.settings = null;
  }

  setHeightmap(heightmap, settings = null) {
    this.heightmap = heightmap;
    this.settings = settings;
  }

  exportRAW() {
    if (!this.heightmap) {
      throw new Error("No heightmap available for export");
    }

    const size = this.heightmap.length;
    const buffer = new ArrayBuffer(size * size * 2); // 16-bit per pixel
    const view = new Uint16Array(buffer);

    // Find height range
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const height = this.heightmap[y][x];
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
      }
    }

    const range = maxHeight - minHeight;

    // Convert to 16-bit values (Unity standard)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const height = this.heightmap[y][x];
        const normalizedHeight = range > 0 ? (height - minHeight) / range : 0;
        const value16bit = Math.round(normalizedHeight * 65535);
        view[y * size + x] = value16bit;
      }
    }

    this.downloadFile(
      buffer,
      `terrain_${size}x${size}.raw`,
      "application/octet-stream"
    );
  }

  exportPNG() {
    if (!this.heightmap) {
      throw new Error("No heightmap available for export");
    }

    const size = this.heightmap.length;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = size;
    canvas.height = size;

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Find height range
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const height = this.heightmap[y][x];
        if (isFinite(height)) {
          minHeight = Math.min(minHeight, height);
          maxHeight = Math.max(maxHeight, height);
        }
      }
    }

    const range = maxHeight - minHeight;
    console.log(
      `PNG Export - Height range: ${minHeight.toFixed(
        1
      )} to ${maxHeight.toFixed(1)}`
    );

    // Convert to grayscale PNG
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const height = this.heightmap[y][x];
        let normalizedHeight = 0;

        if (isFinite(height) && range > 0) {
          normalizedHeight = (height - minHeight) / range;
        }

        const grayValue = Math.round(normalizedHeight * 255);
        const index = (y * size + x) * 4;

        data[index] = grayValue; // R
        data[index + 1] = grayValue; // G
        data[index + 2] = grayValue; // B
        data[index + 3] = 255; // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `terrain_heightmap_${size}x${size}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  }

  downloadFile(data, filename, type) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
