class TerrainApp {
  constructor() {
    this.terrainGenerator = new TerrainGenerator();
    this.waterSystem = new WaterSystem();
    this.renderer = null;
    this.exportManager = new ExportManager();
    this.riverDrawer = null;
    this.currentHeightmap = null;
    this.generateTimeout = null;

    this.init();
  }

  init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    try {
      console.log("Setting up TerrainApp...");

      // Initialize renderer
      const canvas = document.getElementById("terrain-preview");
      const riverOverlay = document.getElementById("river-overlay");

      if (canvas) {
        this.renderer = new TerrainRenderer(canvas);
        console.log("Renderer initialized");
      }

      if (riverOverlay) {
        this.riverDrawer = new RiverDrawer(canvas, riverOverlay);
        console.log("River drawer initialized");
      }

      // Setup event listeners
      this.setupEventListeners();

      // Initialize slider values
      this.updateAllSliderValues();

      // Generate initial terrain
      setTimeout(() => this.generateTerrain(), 500);

      console.log("TerrainApp setup complete");
    } catch (error) {
      console.error("Setup error:", error);
    }
  }

  setupEventListeners() {
    console.log("Setting up event listeners...");

    // Generate button
    const generateBtn = document.getElementById("generateTerrain");
    if (generateBtn) {
      generateBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.generateTerrain();
      });
    }

    // Export buttons
    const downloadRAW = document.getElementById("downloadRAW");
    const downloadPNG = document.getElementById("downloadPNG");

    if (downloadRAW) {
      downloadRAW.addEventListener("click", (e) => {
        e.preventDefault();
        this.exportRAW();
      });
    }

    if (downloadPNG) {
      downloadPNG.addEventListener("click", (e) => {
        e.preventDefault();
        this.exportPNG();
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById("toggle-theme");
    if (themeBtn) {
      themeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleTheme();
      });
    }

    // Preview controls
    const wireframeCheck = document.getElementById("showWireframe");
    const contoursCheck = document.getElementById("showContours");

    if (wireframeCheck) {
      wireframeCheck.addEventListener("change", (e) => {
        if (this.renderer) {
          this.renderer.setWireframe(e.target.checked);
          this.renderPreview();
        }
      });
    }

    if (contoursCheck) {
      contoursCheck.addEventListener("change", (e) => {
        if (this.renderer) {
          this.renderer.setContours(e.target.checked);
          this.renderPreview();
        }
      });
    }

    // Water type change - show/hide river controls
    const waterTypeSelect = document.getElementById("waterType");
    if (waterTypeSelect) {
      waterTypeSelect.addEventListener("change", (e) => {
        this.handleWaterTypeChange(e.target.value);
        this.generateTerrain();
      });
    }

    // River drawing controls
    const toggleRiverMode = document.getElementById("toggleRiverMode");
    const clearRiver = document.getElementById("clearRiver");
    const riverWidth = document.getElementById("riverWidth");

    if (toggleRiverMode) {
      toggleRiverMode.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleRiverDrawingMode();
      });
    }

    if (clearRiver) {
      clearRiver.addEventListener("click", (e) => {
        e.preventDefault();
        this.clearCustomRiver();
      });
    }

    if (riverWidth) {
      riverWidth.addEventListener("input", () => {
        this.updateSliderValue("riverWidth");
        if (this.riverDrawer) {
          this.riverDrawer.setRiverWidth(parseInt(riverWidth.value));
        }
      });
    }

    // Range inputs
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach((slider) => {
      slider.addEventListener("input", () => {
        this.updateSliderValue(slider.id);
      });

      slider.addEventListener("change", () => {
        this.debounceGenerate();
      });
    });

    // Select inputs
    const selects = document.querySelectorAll("select");
    selects.forEach((select) => {
      if (select.id !== "waterType") {
        // Already handled above
        select.addEventListener("change", () => {
          this.generateTerrain();
        });
      }
    });

    // Seed input
    const seedInput = document.getElementById("seed");
    if (seedInput) {
      seedInput.addEventListener("change", () => {
        this.generateTerrain();
      });
    }
  }

  handleWaterTypeChange(waterType) {
    const riverControls = document.getElementById("river-drawing-controls");
    if (riverControls) {
      riverControls.classList.toggle("hidden", waterType !== "custom-river");
    }

    // Disable river drawing mode if not custom river
    if (waterType !== "custom-river" && this.riverDrawer) {
      this.riverDrawer.setDrawingMode(false);
      const toggleBtn = document.getElementById("toggleRiverMode");
      if (toggleBtn) {
        toggleBtn.classList.remove("active");
        toggleBtn.textContent = "✏️ Draw Mode";
      }
    }
  }

  toggleRiverDrawingMode() {
    if (!this.riverDrawer) return;

    const toggleBtn = document.getElementById("toggleRiverMode");
    const isActive = toggleBtn.classList.toggle("active");

    this.riverDrawer.setDrawingMode(isActive);
    toggleBtn.textContent = isActive ? "✋ Stop Drawing" : "✏️ Draw Mode";
  }

  clearCustomRiver() {
    if (this.riverDrawer) {
      this.riverDrawer.clearRiver();
      this.generateTerrain();
    }
  }

  updateCustomRiver(riverData) {
    if (this.waterSystem) {
      this.waterSystem.setCustomRiverData(riverData);
      this.generateTerrain();
    }
  }

  updateAllSliderValues() {
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach((slider) => {
      this.updateSliderValue(slider.id);
    });
  }

  updateSliderValue(sliderId) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(sliderId + "Value");

    if (!slider || !display) return;

    let value = parseFloat(slider.value);
    let suffix = "";
    let decimals = 0;

    switch (sliderId) {
      case "maxHeight":
      case "waterLevel":
        suffix = "m";
        break;
      case "riverWidth":
        suffix = "px";
        break;
      case "terrainScale":
        decimals = 3;
        break;
      case "persistence":
      case "lacunarity":
      case "contrast":
        decimals = 1;
        break;
    }

    display.textContent = value.toFixed(decimals) + suffix;
  }

  getSettings() {
    const settings = {
      size: document.getElementById("terrainSize")?.value || "513",
      maxHeight: parseFloat(document.getElementById("maxHeight")?.value) || 150,
      scale:
        parseFloat(document.getElementById("terrainScale")?.value) || 0.005,
      octaves: parseInt(document.getElementById("octaves")?.value) || 4,
      persistence:
        parseFloat(document.getElementById("persistence")?.value) || 0.4,
      lacunarity:
        parseFloat(document.getElementById("lacunarity")?.value) || 1.8,
      terrainType: document.getElementById("terrainType")?.value || "hills",
      waterType: document.getElementById("waterType")?.value || "none",
      waterLevel:
        parseFloat(document.getElementById("waterLevel")?.value) || 30,
      smoothing: parseInt(document.getElementById("smoothing")?.value) || 2,
      contrast: parseFloat(document.getElementById("contrast")?.value) || 1.1,
      seed: parseInt(document.getElementById("seed")?.value) || 12345,
    };

    return settings;
  }

  async generateTerrain() {
    try {
      console.log("Starting terrain generation...");
      this.showLoading(true);

      const settings = this.getSettings();

      // Small delay for UI
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Generate terrain
      let heightmap = this.terrainGenerator.generate(settings);

      if (!heightmap) {
        throw new Error("Failed to generate heightmap");
      }

      // Apply water features
      heightmap = this.waterSystem.applyWater(heightmap, settings);

      this.currentHeightmap = heightmap;
      this.exportManager.setHeightmap(heightmap);

      // Render preview
      this.renderPreview();

      // Update stats
      this.updateStats();

      console.log("Terrain generation complete!");
    } catch (error) {
      console.error("Error generating terrain:", error);
      alert("Error generating terrain: " + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  renderPreview() {
    if (!this.renderer || !this.currentHeightmap) {
      console.warn("Cannot render preview: missing renderer or heightmap");
      return;
    }

    try {
      const settings = this.getSettings();
      this.renderer.render(this.currentHeightmap, settings);
      console.log("Preview rendered successfully");
    } catch (error) {
      console.error("Render error:", error);
    }
  }

  updateStats() {
    const stats = this.terrainGenerator.getHeightmapStats();
    if (!stats) return;

    const elements = {
      size: document.getElementById("stat-size"),
      min: document.getElementById("stat-min"),
      max: document.getElementById("stat-max"),
      avg: document.getElementById("stat-avg"),
    };

    if (elements.size)
      elements.size.textContent = `${stats.size}x${stats.size}`;
    if (elements.min) elements.min.textContent = stats.min + "m";
    if (elements.max) elements.max.textContent = stats.max + "m";
    if (elements.avg) elements.avg.textContent = stats.avg + "m";

    const infoPanel = document.getElementById("terrain-info");
    if (infoPanel) {
      infoPanel.innerHTML = `
                <p><strong>✅ Terrain Generated Successfully!</strong></p>
                <p>Ready for export to Unity</p>
            `;
    }
  }

  exportRAW() {
    try {
      if (!this.currentHeightmap) {
        alert("Please generate terrain first!");
        return;
      }
      this.exportManager.exportRAW();
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed: " + error.message);
    }
  }

  exportPNG() {
    try {
      if (!this.currentHeightmap) {
        alert("Please generate terrain first!");
        return;
      }
      this.exportManager.exportPNG();
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed: " + error.message);
    }
  }

  showLoading(show) {
    const loading = document.getElementById("loading");
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }

  toggleTheme() {
    document.body.classList.toggle("light-theme");
    const themeBtn = document.getElementById("toggle-theme");
    if (themeBtn) {
      themeBtn.textContent = document.body.classList.contains("light-theme")
        ? "☀️"
        : "🌙";
    }
  }

  debounceGenerate() {
    if (this.generateTimeout) {
      clearTimeout(this.generateTimeout);
    }
    this.generateTimeout = setTimeout(() => {
      this.generateTerrain();
    }, 300);
  }
}

// Global functions
window.randomSeed = function () {
  const seedInput = document.getElementById("seed");
  if (seedInput) {
    const newSeed = Math.floor(Math.random() * 1000000);
    seedInput.value = newSeed;
    seedInput.dispatchEvent(new Event("change"));
  }
};

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing TerrainApp...");
  window.terrainApp = new TerrainApp();
});
