// Simple sound effect utilities using Web Audio API
class SoundEffects {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize AudioContext on first user interaction
    this.initAudio();
  }

  private initAudio() {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
      }
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      this.initAudio();
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  async playCollisionSound() {
    const ctx = await this.ensureAudioContext();
    if (!ctx) return;

    try {
      // Create a short "pop" sound for collision
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Random frequency for variety
      const frequency = 200 + Math.random() * 400;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, ctx.currentTime + 0.1);

      // Quick fade out
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      oscillator.type = 'square';
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (error) {
      console.warn('Failed to play collision sound:', error);
    }
  }

  async playKickSound() {
    const ctx = await this.ensureAudioContext();
    if (!ctx) return;

    try {
      // Create a "negative" sound for getting kicked
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Descending tone
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      oscillator.type = 'sawtooth';
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (error) {
      console.warn('Failed to play kick sound:', error);
    }
  }
}

export const soundEffects = new SoundEffects();