// Global read-aloud functionality (text-to-speech)
const speakText = (text) => {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 0.8;
  speechSynthesis.speak(utterance);
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

  // Read page content
  btn.addEventListener('click', () => {
    // Stop current speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      btn.style.background = '#2c2c85';
      btn.setAttribute('aria-pressed', 'false');
      return;
    }

    // Get main content to read
    const mainContent = document.querySelector('main') || document.body;
    const text = mainContent.innerText;

    if (text.trim()) {
      speakText(text);
      btn.style.background = '#d56b91';
      btn.setAttribute('aria-pressed', 'true');

      // Revert button when speech ends
      speechSynthesis.onend = () => {
        btn.style.background = '#2c2c85';
        btn.setAttribute('aria-pressed', 'false');
      };
    }
  });

  // Handle stop on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && speechSynthesis.speaking) {
      speechSynthesis.cancel();
      btn.style.background = '#2c2c85';
      btn.setAttribute('aria-pressed', 'false');
    }
  });

  document.body.appendChild(btn);
});
