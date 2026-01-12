/**
 * Tạo spectrum visualizer dạng text-based
 * Simulate spectrum bars dựa trên position và volume
 */
export function createSpectrumVisualizer(
  position: number,
  duration: number,
  volume: number,
  bars: number = 12
): string {
  // Tạo pattern dựa trên position và volume
  // Sử dụng sine wave để tạo pattern giống spectrum
  const progress = position / duration;
  const volumeFactor = volume / 100;

  let spectrum = '';

  for (let i = 0; i < bars; i++) {
    // Tạo pattern dựa trên position và index của bar
    const phase = progress * 2 * Math.PI + i * 0.5;
    const amplitude = Math.sin(phase) * 0.5 + 0.5; // 0-1 range
    const height = Math.floor(amplitude * volumeFactor * 8); // 0-8 height

    // Chọn emoji dựa trên height
    let bar = '';
    if (height === 0) {
      bar = '▁';
    } else if (height === 1) {
      bar = '▂';
    } else if (height === 2) {
      bar = '▃';
    } else if (height === 3) {
      bar = '▄';
    } else if (height === 4) {
      bar = '▅';
    } else if (height === 5) {
      bar = '▆';
    } else if (height === 6) {
      bar = '▇';
    } else if (height >= 7) {
      bar = '█';
    } else {
      bar = '▁';
    }

    spectrum += bar;
  }

  return spectrum;
}

/**
 * Tạo animated spectrum visualizer với nhiều frames
 * Trả về frame hiện tại dựa trên position
 */
export function createAnimatedSpectrum(
  position: number,
  duration: number,
  volume: number,
  bars: number = 12
): string {
  // Tạo nhiều patterns khác nhau dựa trên position
  const time = position / 1000; // Convert to seconds
  const progress = position / duration;

  let spectrum = '';

  for (let i = 0; i < bars; i++) {
    // Tạo pattern phức tạp hơn với nhiều frequency
    const freq1 = time * 2 + i * 0.3;
    const freq2 = time * 3 + i * 0.5;
    const freq3 = time * 1.5 + i * 0.7;

    const wave1 = Math.sin(freq1) * 0.3;
    const wave2 = Math.sin(freq2) * 0.2;
    const wave3 = Math.sin(freq3) * 0.1;

    const amplitude = ((wave1 + wave2 + wave3 + 0.4) * volume) / 100;
    const normalized = Math.max(0, Math.min(1, amplitude));
    const height = Math.floor(normalized * 8);

    // Chọn emoji dựa trên height
    const barsMap = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const bar = barsMap[Math.min(height, barsMap.length - 1)];

    spectrum += bar;
  }

  return spectrum;
}

/**
 * Tạo spectrum visualizer với màu sắc (sử dụng emoji có màu)
 */
export function createColoredSpectrum(
  position: number,
  duration: number,
  volume: number,
  bars: number = 12
): string {
  const progress = position / duration;
  const volumeFactor = volume / 100;

  let spectrum = '';

  for (let i = 0; i < bars; i++) {
    const phase = progress * 2 * Math.PI * 2 + i * 0.4;
    const amplitude = (Math.sin(phase) * 0.5 + 0.5) * volumeFactor;
    const height = Math.floor(amplitude * 8);

    // Sử dụng emoji bars với gradient effect
    const barsMap = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const bar = barsMap[Math.min(height, barsMap.length - 1)];

    // Thêm màu dựa trên height (sử dụng emoji)
    let coloredBar = bar;
    if (height >= 6) {
      // High bars - màu đỏ/cam
      coloredBar = '🟥' + bar;
    } else if (height >= 4) {
      // Medium bars - màu vàng
      coloredBar = '🟨' + bar;
    } else if (height >= 2) {
      // Low bars - màu xanh lá
      coloredBar = '🟩' + bar;
    } else {
      // Very low - màu xanh dương
      coloredBar = '🟦' + bar;
    }

    spectrum += coloredBar + ' ';
  }

  return spectrum.trim();
}

/**
 * Tạo spectrum visualizer đơn giản với bars
 * Sử dụng nhiều frequency để tạo pattern giống spectrum thật
 */
export function createSimpleSpectrum(
  position: number,
  duration: number,
  volume: number,
  bars: number = 15
): string {
  const time = position / 1000; // Convert to seconds
  const volumeFactor = volume / 100;
  const progress = position / duration;

  let spectrum = '';

  for (let i = 0; i < bars; i++) {
    // Tạo pattern với nhiều frequency để giống spectrum thật
    // Mỗi bar có frequency khác nhau để tạo hiệu ứng wave
    const baseFreq = time * 3;
    const freq1 = baseFreq + i * 0.4;
    const freq2 = baseFreq * 1.7 + i * 0.6;
    const freq3 = baseFreq * 0.8 + i * 0.9;
    const freq4 = baseFreq * 2.3 + i * 0.3;

    // Combine multiple waves
    const wave1 = Math.sin(freq1) * 0.3;
    const wave2 = Math.sin(freq2) * 0.25;
    const wave3 = Math.sin(freq3) * 0.2;
    const wave4 = Math.sin(freq4) * 0.15;

    // Add some randomness based on position
    const randomFactor = Math.sin(time * 5 + i) * 0.1;

    const combined = wave1 + wave2 + wave3 + wave4 + randomFactor;
    const normalized = Math.max(0, Math.min(1, (combined + 0.5) * volumeFactor));

    // Scale height (0-8)
    const height = Math.floor(normalized * 8);

    // Unicode block characters for bars
    const barsMap = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    spectrum += barsMap[Math.min(height, barsMap.length - 1)];
  }

  return spectrum;
}

/**
 * Tạo spectrum visualizer với gradient colors (sử dụng emoji)
 */
export function createGradientSpectrum(
  position: number,
  duration: number,
  volume: number,
  bars: number = 15
): string {
  const time = position / 1000;
  const volumeFactor = volume / 100;

  let spectrum = '';

  for (let i = 0; i < bars; i++) {
    const baseFreq = time * 3;
    const freq1 = baseFreq + i * 0.4;
    const freq2 = baseFreq * 1.7 + i * 0.6;
    const freq3 = baseFreq * 0.8 + i * 0.9;

    const wave = Math.sin(freq1) * 0.3 + Math.sin(freq2) * 0.25 + Math.sin(freq3) * 0.2;
    const normalized = Math.max(0, Math.min(1, (wave + 0.5) * volumeFactor));
    const height = Math.floor(normalized * 8);

    const barsMap = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const bar = barsMap[Math.min(height, barsMap.length - 1)];

    // Add color based on height and position
    let coloredBar = bar;
    if (height >= 7) {
      coloredBar = '🔴' + bar;
    } else if (height >= 5) {
      coloredBar = '🟠' + bar;
    } else if (height >= 3) {
      coloredBar = '🟡' + bar;
    } else if (height >= 1) {
      coloredBar = '🟢' + bar;
    }

    spectrum += coloredBar;
  }

  return spectrum;
}
