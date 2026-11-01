// Synthesized soothing ambient soundscapes using the Web Audio API
// Completely offline, no external audio files required

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioNode | null = null;
  private currentGain: GainNode | null = null;
  private isPlayingType: string | null = null;
  private intervalId: any = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.currentGain && this.ctx) {
      try {
        this.currentGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      } catch {}
    }
    setTimeout(() => {
      if (this.currentSource) {
        try {
          (this.currentSource as any).stop?.();
          this.currentSource.disconnect();
        } catch {}
        this.currentSource = null;
      }
      this.isPlayingType = null;
    }, 250);
  }

  public getCurrentlyPlaying(): string | null {
    return this.isPlayingType;
  }

  // Create White/Pink Noise Buffer
  private createNoiseBuffer(seconds: number = 3): AudioBuffer {
    if (!this.ctx) this.initContext();
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // Play Gentle Rain Sound
  public playRain() {
    this.stop();
    this.initContext();
    const ctx = this.ctx!;

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = this.createNoiseBuffer(5);
    bufferSource.loop = true;

    // Filter to simulate soft raindrops
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 1);

    bufferSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    bufferSource.start();
    this.currentSource = bufferSource;
    this.currentGain = gainNode;
    this.isPlayingType = 'rain';
  }

  // Play Ocean Waves
  public playOcean() {
    this.stop();
    this.initContext();
    const ctx = this.ctx!;

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = this.createNoiseBuffer(5);
    bufferSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);

    // LFO for wave ebb and flow
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec wave cycle
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.25, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);
    lfo.start();

    bufferSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    bufferSource.start();
    this.currentSource = bufferSource;
    this.currentGain = gainNode;
    this.isPlayingType = 'ocean';
  }

  // Play Singing Bowl resonance
  public playSingingBowl() {
    this.stop();
    this.initContext();
    const ctx = this.ctx!;

    const strike = () => {
      if (!this.ctx || this.isPlayingType !== 'singing_bowl') return;
      const baseFreq = 261.63; // Middle C
      const harmonics = [1, 2.76, 5.4, 8.93];
      const gains = [0.4, 0.2, 0.08, 0.03];

      harmonics.forEach((h, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * h, ctx.currentTime);

        g.gain.setValueAtTime(gains[idx], ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.5);

        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 6);
      });
    };

    this.isPlayingType = 'singing_bowl';
    strike();
    this.intervalId = setInterval(strike, 6500);
  }

  // Play Soft White Noise
  public playWhiteNoise() {
    this.stop();
    this.initContext();
    const ctx = this.ctx!;

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = this.createNoiseBuffer(4);
    bufferSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 1);

    bufferSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    bufferSource.start();
    this.currentSource = bufferSource;
    this.currentGain = gainNode;
    this.isPlayingType = 'whitenoise';
  }
}

export const ambientEngine = new AmbientAudioEngine();
