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
                throw new Error('Canvas element not found');
            }

            this.ctx = this.canvas.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('2D Canvas context not supported');
            }

            // Set canvas size
            this.canvas.width = 512;
            this.canvas.height = 512;

            // Clear with default background
            this.ctx.fillStyle = '#1a1a3a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Show ready message
            this.ctx.fillStyle = '#00ff88';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Ready - Generate Terrain', this.canvas.width/2, this.canvas.height/2);

            this.isInitialized = true;
            console.log('Canvas initialized successfully');
        } catch (error) {
            console.error('Canvas initialization failed:', error);
            this.isInitialized = false;
        }
    }

    render(heightmap, settings) {
        if (!this.isInitialized || !heightmap || !this.ctx) {
            console.log('Preview not available');
            return;
        }

        try {
            const size = heightmap.length;
            const canvasSize = 512;

            // Clear canvas
            this.ctx.clearRect(0, 0, canvasSize, canvasSize);

            // Create image data
            const imageData = this.ctx.createImageData(canvasSize, canvasSize);
            const data = imageData.data;

            // Find height range
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

            // Render pixels
            for (let y = 0; y < canvasSize; y++) {
                for (let x = 0; x < canvasSize; x++) {
                    const mapX = Math.floor((x / canvasSize) * size);
                    const mapY = Math.floor((y / canvasSize) * size);

                    const height = heightmap[mapY] && heightmap[mapY][mapX] !== undefined 
                        ? heightmap[mapY][mapX] 
                        : 0;
                    
                    const normalizedHeight = heightRange > 0 
                        ? (height - minHeight) / heightRange 
                        : 0;

                    const color = this.getColorForHeight(normalizedHeight, height, settings.waterLevel || 30);

                    const index = (y * canvasSize + x) * 4;
                    data[index] = color.r;
                    data[index + 1] = color.g;
                    data[index + 2] = color.b;
                    data[index + 3] = 255;
                }
            }

            // Draw image
            this.ctx.putImageData(imageData, 0, 0);

            // Add overlays
            if (this.showWireframe) {
                this.drawWireframe(heightmap, canvasSize);
            }

            if (this.showContours) {
                this.drawContours(heightmap, canvasSize, maxHeight, minHeight);
            }

        } catch (error) {
            console.error('Render error:', error);
            
            // Show error
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Render Error', this.canvas.width/2, this.canvas.height/2);
        }
    }

    getColorForHeight(normalizedHeight, actualHeight, waterLevel) {
        // Water detection
        if (actualHeight <= waterLevel) {
            const depth = Math.max(0, Math.min(1, (waterLevel - actualHeight) / 50));
            return {
                r: Math.round(30 + depth * 40),
                g: Math.round(100 + depth * 80),
                b: Math.round(200 + depth * 55)
            };
        }

        // Terrain colors
        if (normalizedHeight < 0.2) {
            // Low areas - green
            return { r: 50, g: 120, b: 50 };
        } else if (normalizedHeight < 0.4) {
            // Medium low - lighter green
            return { r: 70, g: 140, b: 70 };
        } else if (normalizedHeight < 0.6) {
            // Medium - yellow-green
            return { r: 100, g: 130, b: 50 };
        } else if (normalizedHeight < 0.8) {
            // High - brown
            return { r: 130, g: 100, b: 70 };
        } else {
            // Very high - light gray
            return { r: 200, g: 200, b: 200 };
        }
    }

    drawWireframe(heightmap, canvasSize) {
        if (!this.ctx) return;
        
        const size = heightmap.length;
        const step = Math.max(1, Math.floor(size / 25));

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
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
        if (!this.ctx) return;
        
        const size = heightmap.length;
        const heightStep = (maxHeight - minHeight) / 10;

        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';

        for (let level = 1; level < 10; level++) {
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

                if ((h1 <= contourHeight && (h2 > contourHeight || h3 > contourHeight)) || 
                    (h1 > contourHeight && (h2 <= contourHeight || h3 <= contourHeight))) {
                    
                    const canvasX = (x / size) * canvasSize;
                    const canvasY = (y / size) * canvasSize;
                    
                    this.ctx.rect(canvasX, canvasY, 1, 1);
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