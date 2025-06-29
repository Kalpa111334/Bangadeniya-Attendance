// Voice Feedback Service
export class VoiceService {
  private static instance: VoiceService;
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  private constructor() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
    }
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  private loadVoices(): void {
    if (!this.synth) return;
    
    this.voices = this.synth.getVoices();
    
    // Load voices when they're ready
    if (this.voices.length === 0) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth!.getVoices();
      };
    }
  }

  speak(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}): void {
    if (!this.synth) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice properties
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    // Use English voice if available
    const englishVoice = this.voices.find(voice => 
      voice.lang.startsWith('en') && voice.localService
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    this.synth.speak(utterance);
  }

  announceAttendance(employeeName: string, action: string, time: string): void {
    const actionText = this.getActionText(action);
    const message = `${employeeName} has ${actionText} at ${this.formatTimeForSpeech(time)}`;
    this.speak(message);
  }

  announceSuccess(message: string): void {
    this.speak(`Success! ${message}`, { pitch: 1.2, rate: 0.9 });
  }

  announceError(message: string): void {
    this.speak(`Error! ${message}`, { pitch: 0.8, rate: 0.8 });
  }

  private getActionText(action: string): string {
    const actionMap: { [key: string]: string } = {
      'first_check_in': 'checked in for the first time',
      'first_check_out': 'checked out for the first time',
      'second_check_in': 'checked in for the second time',
      'second_check_out': 'checked out for the second time',
    };
    return actionMap[action] || action;
  }

  private formatTimeForSpeech(time: string): string {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
}

export const voiceService = VoiceService.getInstance();