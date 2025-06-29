// Advanced Feedback System with Audio, Haptic, and Visual Feedback
export class FeedbackSystem {
  private static instance: FeedbackSystem;
  private audioContext: AudioContext | null = null;
  private lastFeedbackTime: number = 0;
  private feedbackCooldown: number = 2000; // 2 seconds

  private constructor() {
    this.initializeAudio();
  }

  static getInstance(): FeedbackSystem {
    if (!FeedbackSystem.instance) {
      FeedbackSystem.instance = new FeedbackSystem();
    }
    return FeedbackSystem.instance;
  }

  private initializeAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  async playTeakSound(): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Resume audio context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create a distinctive "teak" sound using Web Audio API
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure the "teak" sound
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);

      // Volume envelope for crisp sound
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

      // Play the sound
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.15);

    } catch (error) {
      console.warn('Could not play teak sound:', error);
    }
  }

  async triggerHapticFeedback(): Promise<void> {
    if ('vibrate' in navigator) {
      try {
        // Distinctive vibration pattern for QR detection
        navigator.vibrate([100, 50, 100]); // Short-pause-short pattern
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    }
  }

  async showVisualConfirmation(element: HTMLElement): Promise<void> {
    // Create visual flash effect
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(34, 197, 94, 0.3);
      pointer-events: none;
      z-index: 9999;
      animation: flashConfirmation 0.3s ease-out;
    `;

    // Add flash animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flashConfirmation {
        0% { opacity: 0; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.1); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // Remove after animation
    setTimeout(() => {
      document.body.removeChild(overlay);
      document.head.removeChild(style);
    }, 300);

    // Add border flash to scanner area
    element.style.transition = 'border-color 0.3s ease';
    element.style.borderColor = '#22c55e';
    element.style.borderWidth = '3px';
    element.style.borderStyle = 'solid';

    setTimeout(() => {
      element.style.borderColor = '';
      element.style.borderWidth = '';
      element.style.borderStyle = '';
    }, 300);
  }

  async provideFeedback(
    type: 'success' | 'error' | 'warning',
    element?: HTMLElement
  ): Promise<void> {
    const now = Date.now();
    
    // Prevent duplicate feedback within cooldown period
    if (now - this.lastFeedbackTime < this.feedbackCooldown) {
      return;
    }

    this.lastFeedbackTime = now;

    switch (type) {
      case 'success':
        await Promise.all([
          this.playTeakSound(),
          this.triggerHapticFeedback(),
          element ? this.showVisualConfirmation(element) : Promise.resolve()
        ]);
        break;

      case 'error':
        await this.triggerHapticFeedback();
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]); // Error pattern
        }
        break;

      case 'warning':
        if ('vibrate' in navigator) {
          navigator.vibrate([150]); // Single warning vibration
        }
        break;
    }
  }

  isDuplicateFeedback(): boolean {
    return (Date.now() - this.lastFeedbackTime) < this.feedbackCooldown;
  }

  setCooldownPeriod(milliseconds: number): void {
    this.feedbackCooldown = milliseconds;
  }

  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.lastFeedbackTime = 0;
  }
}

export const feedbackSystem = FeedbackSystem.getInstance();