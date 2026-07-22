// Urdu translation and language toggle functionality
class TranslationManager {
  constructor() {
    this.currentLang = localStorage.getItem('preferred-language') || 'en';
    this.translationCache = new Map();
    this.isTranslating = false;
  }

  async translateText(text, targetLang) {
    if (targetLang === 'en' || !text || !text.trim()) return text;

    const cacheKey = `${text.substring(0, 50)}|${targetLang}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), targetLang }),
      });

      const data = await response.json();
      if (data.ok) {
        this.translationCache.set(cacheKey, data.translatedText);
        return data.translatedText;
      }
    } catch (error) {
      console.error('Translation error:', error);
    }

    return text;
  }

  async translatePage(lang) {
    if (this.isTranslating) return;
    this.isTranslating = true;

    try {
      // Get all text nodes from the main content
      const mainContent = document.querySelector('main') || document.body;
      const textNodes = [];

      const walker = document.createTreeWalker(
        mainContent,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue.trim();
        if (text.length > 0 && text.length < 500) {
          textNodes.push(node);
        }
      }

      console.log(`Found ${textNodes.length} text nodes to translate`);

      // Translate each node
      for (const textNode of textNodes) {
        try {
          const originalText = textNode.nodeValue;
          const translated = await this.translateText(originalText, lang);
          if (translated && translated !== originalText) {
            textNode.nodeValue = translated;
          }
        } catch (e) {
          console.error('Error translating node:', e);
        }
      }

      // Translate aria-labels and titles
      const elements = document.querySelectorAll('[aria-label], [title]');
      for (const el of elements) {
        try {
          if (el.getAttribute('aria-label')) {
            const ariaLabel = el.getAttribute('aria-label');
            const translated = await this.translateText(ariaLabel, lang);
            if (translated) el.setAttribute('aria-label', translated);
          }
          if (el.getAttribute('title')) {
            const title = el.getAttribute('title');
            const translated = await this.translateText(title, lang);
            if (translated) el.setAttribute('title', translated);
          }
        } catch (e) {
          console.error('Error translating element attributes:', e);
        }
      }

      console.log('Translation complete');
    } catch (error) {
      console.error('translatePage error:', error);
    } finally {
      this.isTranslating = false;
    }
  }

  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('preferred-language', lang);
    console.log(`Switching to language: ${lang}`);

    if (lang === 'en') {
      location.reload();
    } else {
      this.translatePage(lang);
    }
  }
}

const translationMgr = new TranslationManager();

// Initialize language toggle on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if toggle already exists
  if (document.getElementById('language-toggle-btn')) return;

  // Create language toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'language-toggle-btn';
  toggleBtn.type = 'button';
  toggleBtn.textContent = translationMgr.currentLang === 'ur' ? 'EN' : 'اردو';
  toggleBtn.setAttribute('aria-label', translationMgr.currentLang === 'ur' ? 'Switch to English' : 'Switch to Urdu');
  toggleBtn.title = translationMgr.currentLang === 'ur' ? 'Switch to English' : 'Switch to Urdu (اردو)';
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 96px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #2c2c85;
    color: white;
    border: none;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(44, 44, 133, 0.3);
    z-index: 998;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;

  // Hover effect
  toggleBtn.addEventListener('mouseenter', () => {
    toggleBtn.style.transform = 'scale(1.1)';
    toggleBtn.style.boxShadow = '0 8px 24px rgba(44, 44, 133, 0.4)';
  });
  toggleBtn.addEventListener('mouseleave', () => {
    toggleBtn.style.transform = 'scale(1)';
    toggleBtn.style.boxShadow = '0 4px 16px rgba(44, 44, 133, 0.3)';
  });

  // Toggle language on click
  toggleBtn.addEventListener('click', async () => {
    const newLang = translationMgr.currentLang === 'en' ? 'ur' : 'en';
    toggleBtn.disabled = true;
    toggleBtn.style.opacity = '0.6';

    await new Promise(resolve => setTimeout(resolve, 300));
    translationMgr.setLanguage(newLang);
  });

  document.body.appendChild(toggleBtn);

  // Auto-translate if user's preference is Urdu
  if (translationMgr.currentLang === 'ur') {
    translationMgr.translatePage('ur');
  }
});
