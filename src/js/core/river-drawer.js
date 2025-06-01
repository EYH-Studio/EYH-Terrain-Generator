class RiverDrawer {
  constructor(canvas, overlayCanvas) {
    this.canvas = canvas;
    this.overlayCanvas = overlayCanvas;
    this.ctx = overlayCanvas.getContext("2d");
    this.isDrawing = false;
    this.isDrawingMode = false;
    this.riverPath = [];
    this.riverWidth = 15;

    this.setupCanvas();
    this.setupEventListeners();
  }

  setupCanvas() {
    // Ensure overlay canvas matches terrain canvas
    this.overlayCanvas.width = 512;
    this.overlayCanvas.height = 512;
    this.overlayCanvas.style.width = "512px";
    this.overlayCanvas.style.height = "512px";

    // Make overlay transparent
    this.ctx.clearRect(0, 0, 512, 512);
  }

  setupEventListeners() {
    // Mouse events for drawing
    this.overlayCanvas.addEventListener("mousedown", (e) =>
      this.startDrawing(e)
    );
    this.overlayCanvas.addEventListener("mousemove", (e) => this.draw(e));
    this.overlayCanvas.addEventListener("mouseup", () => this.stopDrawing());
    this.overlayCanvas.addEventListener("mouseleave", () => this.stopDrawing());

    // Touch events for mobile
    this.overlayCanvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.overlayCanvas.getBoundingClientRect();
      const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      this.startDrawing(mouseEvent);
    });

    this.overlayCanvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      this.draw(mouseEvent);
    });

    this.overlayCanvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.stopDrawing();
    });
  }

  getCanvasPosition(e) {
    const rect = this.overlayCanvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 512,
      y: ((e.clientY - rect.top) / rect.height) * 512,
    };
  }

  startDrawing(e) {
    if (!this.isDrawingMode) return;

    this.isDrawing = true;
    const pos = this.getCanvasPosition(e);
    this.riverPath = [pos];

    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);

    console.log("Started drawing river at:", pos);
  }

  draw(e) {
    if (!this.isDrawing || !this.isDrawingMode) return;

    const pos = this.getCanvasPosition(e);
    this.riverPath.push(pos);

    // Draw river segment with better visuals
    this.ctx.strokeStyle = "rgba(64, 164, 255, 0.9)"; // Brighter blue
    this.ctx.lineWidth = this.riverWidth;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.shadowColor = "rgba(64, 164, 255, 0.5)";
    this.ctx.shadowBlur = 3;

    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    console.log(
      "River drawing completed with",
      this.riverPath.length,
      "points"
    );

    // Smooth the river path
    this.smoothRiverPath();

    // Trigger terrain update after a short delay to ensure drawing is complete
    setTimeout(() => {
      if (window.terrainApp && this.riverPath.length > 0) {
        window.terrainApp.updateCustomRiver(this.getRiverData());
      }
    }, 100);
  }

  smoothRiverPath() {
    if (this.riverPath.length < 3) return;

    // Simple smoothing algorithm
    const smoothed = [this.riverPath[0]];

    for (let i = 1; i < this.riverPath.length - 1; i++) {
      const prev = this.riverPath[i - 1];
      const curr = this.riverPath[i];
      const next = this.riverPath[i + 1];

      smoothed.push({
        x: (prev.x + curr.x + next.x) / 3,
        y: (prev.y + curr.y + next.y) / 3,
      });
    }

    smoothed.push(this.riverPath[this.riverPath.length - 1]);
    this.riverPath = smoothed;

    // Redraw smoothed path
    this.redrawRiver();
  }

  redrawRiver() {
    this.ctx.clearRect(0, 0, 512, 512);

    if (this.riverPath.length < 2) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = "rgba(64, 164, 255, 0.9)";
    this.ctx.lineWidth = this.riverWidth;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.shadowColor = "rgba(64, 164, 255, 0.5)";
    this.ctx.shadowBlur = 3;

    this.ctx.moveTo(this.riverPath[0].x, this.riverPath[0].y);

    for (let i = 1; i < this.riverPath.length; i++) {
      this.ctx.lineTo(this.riverPath[i].x, this.riverPath[i].y);
    }

    this.ctx.stroke();

    // Reset shadow
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
  }

  setDrawingMode(enabled) {
    this.isDrawingMode = enabled;
    const container = document.getElementById("canvas-container");
    if (container) {
      container.classList.toggle("drawing-mode", enabled);
    }
    console.log("Drawing mode:", enabled);
  }

  setRiverWidth(width) {
    this.riverWidth = width;
    console.log("River width set to:", width);

    // Redraw existing river with new width
    if (this.riverPath.length > 0) {
      this.redrawRiver();
    }
  }

  clearRiver() {
    this.riverPath = [];
    this.ctx.clearRect(0, 0, 512, 512);

    // Update terrain
    if (window.terrainApp) {
      window.terrainApp.updateCustomRiver(null);
    }

    console.log("River cleared");
  }

  getRiverData() {
    if (this.riverPath.length === 0) return null;

    // FIXED: Better width scaling for consistent appearance
    const terrainSize = parseInt(
      window.terrainApp?.getSettings().size || "513"
    );
    const canvasSize = 512;
    const scale = terrainSize / canvasSize;

    // Calculate river width that will match visual appearance
    // River width should be proportional to both canvas drawing size and terrain resolution
    const baseWidth = this.riverWidth; // Drawing width on 512px canvas
    const scaledWidth = Math.round(baseWidth * scale * 0.6); // 0.6 factor for better visual match

    const riverData = {
      path: this.riverPath.map((point) => ({
        x: Math.floor(point.x * scale),
        y: Math.floor(point.y * scale),
      })),
      width: Math.max(3, scaledWidth), // Minimum width of 3 pixels
    };

    console.log(
      `River data generated: ${
        riverData.path.length
      } points, canvas width: ${baseWidth}px, terrain width: ${scaledWidth}px, scale: ${scale.toFixed(
        3
      )}`
    );
    return riverData;
  }

  hasRiver() {
    return this.riverPath.length > 0;
  }
}
