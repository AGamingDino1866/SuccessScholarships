// Urdu translation and language toggle functionality
class TranslationManager {
  constructor() {
    this.currentLang = localStorage.getItem('preferred-language') || 'en';
    this.isTranslating = false;
    this.translationCache = new Map();
  }

  async translateBatch(texts) {
    if (!texts || texts.length === 0) return {};

    const batchText = texts.join('\n||||\n');
    const cacheKey = batchText.substring(0, 100);
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(batchText)}&langpair=en|ur`);
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText.split('\n||||\n');
        const result = {};
        texts.forEach((text, i) => {
          result[text] = translated[i] || text;
        });
        this.translationCache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('Batch translation error:', error);
    }

    const result = {};
    texts.forEach(text => result[text] = text);
    return result;
  }

  async translatePage(lang) {
    if (this.isTranslating || lang !== 'ur') return;
    this.isTranslating = true;

    try {
      const mainContent = document.querySelector('main') || document.body;
      const textNodes = [];
      const walker = document.createTreeWalker(mainContent, NodeFilter.SHOW_TEXT, null);

      let node;
      while ((node = walker.nextNode())) {
        const text = node.nodeValue.trim();
        if (text.length > 0 && text.length < 200 && !node.parentElement?.hasAttribute('data-no-translate')) {
          textNodes.push({ node, text });
        }
      }

      console.log(`Translating ${textNodes.length} text nodes to Urdu`);

      // Batch translate in groups of 20 for speed
      const batchSize = 20;
      for (let i = 0; i < textNodes.length; i += batchSize) {
        const batch = textNodes.slice(i, i + batchSize);
        const texts = batch.map(item => item.text);
        const translations = await this.translateBatch(texts);

        batch.forEach(item => {
          const translated = translations[item.text];
          if (translated && translated !== item.text) {
            item.node.nodeValue = translated;
          }
        });
      }

      // Translate aria-labels and titles in parallel
      const elements = Array.from(document.querySelectorAll('[aria-label], [title]'));
      const labels = elements
        .map(el => el.getAttribute('aria-label'))
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);
      const titles = elements
        .map(el => el.getAttribute('title'))
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);

      const allAttrs = [...labels, ...titles];
      if (allAttrs.length > 0) {
        const translations = await this.translateBatch(allAttrs);
        elements.forEach(el => {
          if (el.getAttribute('aria-label')) {
            const translated = translations[el.getAttribute('aria-label')];
            if (translated) el.setAttribute('aria-label', translated);
          }
          if (el.getAttribute('title')) {
            const translated = translations[el.getAttribute('title')];
            if (translated) el.setAttribute('title', translated);
          }
        });
      }

      console.log('Urdu translation complete');
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      this.isTranslating = false;
    }
  }

  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('preferred-language', lang);
    console.log(`Language changed to: ${lang}`);

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
