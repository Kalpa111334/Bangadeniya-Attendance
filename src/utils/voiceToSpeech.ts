export const speakMessage = (message: string): void => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.rate = 0.8
    utterance.pitch = 1
    utterance.volume = 1
    
    // Try to use a more natural voice
    const voices = speechSynthesis.getVoices()
    const englishVoice = voices.find(voice => voice.lang.includes('en'))
    if (englishVoice) {
      utterance.voice = englishVoice
    }
    
    speechSynthesis.speak(utterance)
  }
}

export const speakWelcomeMessage = (employeeName: string, isCheckIn: boolean): void => {
  const action = isCheckIn ? 'checked in' : 'checked out'
  const message = `Welcome ${employeeName}. You have successfully ${action}.`
  speakMessage(message)
}