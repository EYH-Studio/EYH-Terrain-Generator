class TerrainApp {
  constructor() {
    this.terrainGenerator = new TerrainGenerator();
    this.waterSystem = new WaterSystem();
    this.renderer = null;
    this.exportManager = new ExportManager();
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
      if (canvas) {
        this.renderer = new TerrainRenderer(canvas);
        console.log("Renderer initialized");
      } else {
        console.error("Canvas not found!");
      }

      // Setup event listeners
      this.setupEventListeners();

      // Initialize slider values
      this.updateAllSliderValues();

      // Generate initial terrain after a short delay
      setTimeout(() => this.generateTerrain(), 100);

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
        console.log("Generate button clicked");
        this.generateTerrain();
      });
      console.log("Generate button listener added");
    } else {
      console.error("Generate button not found!");
    }

    // Export buttons
    const downloadRAW = document.getElementById("downloadRAW");
    const downloadPNG = document.getElementById("downloadPNG");

    if (downloadRAW) {
      downloadRAW.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("RAW download button clicked");
        this.exportRAW();
      });
      console.log("RAW download listener added");
    } else {
      console.error("RAW download button not found!");
    }

    if (downloadPNG) {
      downloadPNG.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("PNG download button clicked");
        this.exportPNG();
      });
      console.log("PNG download listener added");
    } else {
      console.error("PNG download button not found!");
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

    if (wireframeCheck && this.renderer) {
      wireframeCheck.addEventListener("change", (e) => {
        this.renderer.setWireframe(e.target.checked);
        this.renderPreview();
      });
    }

    if (contoursCheck && this.renderer) {
      contoursCheck.addEventListener("change", (e) => {
        this.renderer.setContours(e.target.checked);
        this.renderPreview();
      });
    }

    // All range inputs
    const sliders = document.querySelectorAll('input[type="range"]');
    console.log(`Found ${sliders.length} sliders`);

    sliders.forEach((slider) => {
      slider.addEventListener("input", () => {
        this.updateSliderValue(slider.id);
      });

      slider.addEventListener("change", () => {
        if (
          ["terrainScale", "octaves", "persistence", "lacunarity"].includes(
            slider.id
          )
        ) {
          this.debounceGenerate();
        }
      });
    });

    // Select inputs
    const selects = document.querySelectorAll("select");
    console.log(`Found ${selects.length} selects`);

    selects.forEach((select) => {
      select.addEventListener("change", () => {
        console.log(`Select changed: ${select.id} = ${select.value}`);
        this.generateTerrain();
      });
    });

    // Seed input
    const seedInput = document.getElementById("seed");
    if (seedInput) {
      seedInput.addEventListener("change", () => {
        console.log(`Seed changed: ${seedInput.value}`);
        this.generateTerrain();
      });
    }

    console.log("All event listeners setup complete");
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
      maxHeight: parseFloat(document.getElementById("maxHeight")?.value) || 600,
      scale:
        parseFloat(document.getElementById("terrainScale")?.value) || 0.008,
      octaves: parseInt(document.getElementById("octaves")?.value) || 6,
      persistence:
        parseFloat(document.getElementById("persistence")?.value) || 0.6,
      lacunarity:
        parseFloat(document.getElementById("lacunarity")?.value) || 2.0,
      terrainType: document.getElementById("terrainType")?.value || "plains",
      waterType: document.getElementById("waterType")?.value || "none",
      waterLevel:
        parseFloat(document.getElementById("waterLevel")?.value) || 50,
      smoothing: parseInt(document.getElementById("smoothing")?.value) || 1,
      contrast: parseFloat(document.getElementById("contrast")?.value) || 1.0,
      seed: parseInt(document.getElementById("seed")?.value) || 12345,
    };

    console.log("Current settings:", settings);
    return settings;
  }

  async generateTerrain() {
    try {
      console.log("Starting terrain generation...");
      this.showLoading(true);

      const settings = this.getSettings();

      // Small delay to allow UI to update
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Generate terrain
      console.log("Generating heightmap...");
      let heightmap = this.terrainGenerator.generate(settings);

      if (!heightmap) {
        throw new Error("Failed to generate heightmap");
      }

      console.log(
        `Generated heightmap: ${heightmap.length}x${heightmap[0].length}`
      );

      // Apply water features
      console.log("Applying water features...");
      heightmap = this.waterSystem.applyWater(heightmap, settings);

      this.currentHeightmap = heightmap;
      this.exportManager.setHeightmap(heightmap);

      // Render preview
      console.log("Rendering preview...");
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
    if (!stats) {
      console.warn("No stats available");
      return;
    }

    const statSize = document.getElementById("stat-size");
    const statMin = document.getElementById("stat-min");
    const statMax = document.getElementById("stat-max");
    const statAvg = document.getElementById("stat-avg");

    if (statSize) statSize.textContent = `${stats.size}x${stats.size}`;
    if (statMin) statMin.textContent = stats.min + "m";
    if (statMax) statMax.textContent = stats.max + "m";
    if (statAvg) statAvg.textContent = stats.avg + "m";

    const infoPanel = document.getElementById("terrain-info");
    if (infoPanel) {
      infoPanel.innerHTML = `
                <p><strong>✅ Terrain Generated Successfully!</strong></p>
                <p>Ready for export to Unity or other applications</p>
            `;
    }

    console.log("Stats updated:", stats);
  }

  exportRAW() {
    try {
      console.log("Starting RAW export...");

      if (!this.currentHeightmap) {
        alert("Please generate terrain first!");
        return;
      }

      this.exportManager.exportRAW();
      console.log("RAW export completed");
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed: " + error.message);
    }
  }

  exportPNG() {
    try {
      console.log("Starting PNG export...");

      if (!this.currentHeightmap) {
        alert("Please generate terrain first!");
        return;
      }

      this.exportManager.exportPNG();
      console.log("PNG export completed");
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
  console.log("Random seed function called");
  const seedInput = document.getElementById("seed");
  if (seedInput) {
    const newSeed = Math.floor(Math.random() * 1000000);
    seedInput.value = newSeed;
    seedInput.dispatchEvent(new Event("change"));
    console.log("New seed generated:", newSeed);
  } else {
    console.error("Seed input not found!");
  }
};

// Initialize app when page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing TerrainApp...");
  window.terrainApp = new TerrainApp();
});

// Fallback initialization
if (document.readyState === "complete") {
  console.log("Document already loaded, initializing TerrainApp...");
  window.terrainApp = new TerrainApp();
}
