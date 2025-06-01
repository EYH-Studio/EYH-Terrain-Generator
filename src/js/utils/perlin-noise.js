class PerlinNoise {
  constructor(seed = Math.random() * 65536) {
    this.seed = seed;
    this.permutation = this.generatePermutation();
    this.gradients = this.generateGradients();
  }

  generatePermutation() {
    const p = Array.from({ length: 256 }, (_, i) => i);
    const rng = this.createSeededRandom(this.seed);

    // Fisher-Yates shuffle
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    return [...p, ...p]; // Duplicate for wrapping
  }

  generateGradients() {
    const gradients = [];
    for (let i = 0; i < 512; i++) {
      const angle = (i / 256) * Math.PI * 2;
      gradients[i] = [Math.cos(angle), Math.sin(angle)];
    }
    return gradients;
  }

  createSeededRandom(seed) {
    const m = 0x80000000;
    const a = 1103515245;
    const c = 12345;
    let state = seed;
    return function () {
      state = (a * state + c) % m;
      return state / (m - 1);
    };
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }

  dot(grad, x, y) {
    return grad[0] * x + grad[1] * y;
  }

  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A];
    const AB = this.permutation[A + 1];
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B];
    const BB = this.permutation[B + 1];

    const grad1 = this.gradients[this.permutation[AA] % 512];
    const grad2 = this.gradients[this.permutation[BA] % 512];
    const grad3 = this.gradients[this.permutation[AB] % 512];
    const grad4 = this.gradients[this.permutation[BB] % 512];

    return this.lerp(
      this.lerp(this.dot(grad1, x, y), this.dot(grad2, x - 1, y), u),
      this.lerp(this.dot(grad3, x, y - 1), this.dot(grad4, x - 1, y - 1), u),
      v
    );
  }

  octaveNoise(x, y, octaves, persistence = 0.5, lacunarity = 2.0) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return maxValue > 0 ? value / maxValue : 0;
  }

  ridgedNoise(x, y, octaves = 4, lacunarity = 2.0) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let weight = 1;

    for (let i = 0; i < octaves; i++) {
      let n = this.noise(x * frequency, y * frequency);
      n = 1 - Math.abs(n);
      n = n * n * weight;
      weight = Math.max(0, Math.min(1, n * 2));

      value += n * amplitude;
      amplitude *= 0.5;
      frequency *= lacunarity;
    }

    return Math.max(0, Math.min(1, value));
  }
}
