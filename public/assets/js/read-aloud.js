// Global read-aloud functionality (text-to-speech) powered by Puter.js
let currentReadAloudAudio = null;

const stopSpeaking = () => {
  if (currentReadAloudAudio) {
    currentReadAloudAudio.pause();
    currentReadAloudAudio = null;
  }
};

const isSpeaking = () => !!currentReadAloudAudio && !currentReadAloudAudio.paused;

// Speaks text using Puter.js AI text-to-speech with a neural feminine voice.
// Returns the audio element (or null on failure) so callers can hook onended.
const speakText = async (text) => {
  stopSpeaking();
  if (!text || !text.trim()) return null;
  if (!window.puter || !window.puter.ai || !window.puter.ai.txt2speech) {
    console.error('Puter.js not available');
    return null;
  }

  try {
    const audio = await puter.ai.txt2speech(text, {
      voice: 'Joanna',
      engine: 'neural',
      language: 'en-US'
    });
    currentReadAloudAudio = audio;
    audio.addEventListener('ended', () => {
      if (currentReadAloudAudio === audio) currentReadAloudAudio = null;
    });
    await audio.play();
    return audio;
  } catch (e) {
    console.error('Puter TTS error:', e);
    return null;
  }
};

// Initialize read-aloud button on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if button already exists
  if (document.getElementById('global-read-aloud-btn')) return;

  // Create floating read-aloud button
  const btn = document.createElement('button');
  btn.id = 'global-read-aloud-btn';
  btn.type = 'button';
  btn.textContent = '🔊';
  btn.setAttribute('aria-label', 'Read page aloud');
  btn.title = 'Read page aloud (press to start/stop)';
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #2c2c85;
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(44, 44, 133, 0.3);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;

  // Hover effect
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 8px 24px rgba(44, 44, 133, 0.4)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 16px rgba(44, 44, 133, 0.3)';
  });

  const resetButton = () => {
    btn.style.background = '#2c2c85';
    btn.setAttribute('aria-pressed', 'false');
  };

  // Read page content
  btn.addEventListener('click', async () => {
    if (isSpeaking()) {
      stopSpeaking();
      resetButton();
      return;
    }

    // Get main content to read
    const mainContent = document.querySelector('main') || document.body;
    const text = mainContent.innerText;

    if (text.trim()) {
      btn.style.background = '#d56b91';
      btn.setAttribute('aria-pressed', 'true');
      const audio = await speakText(text);
      if (!audio) {
        resetButton();
        return;
      }
      audio.addEventListener('ended', resetButton);
    }
  });

  // Handle stop on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSpeaking()) {
      stopSpeaking();
      resetButton();
    }
  });

  document.body.appendChild(btn);
});
