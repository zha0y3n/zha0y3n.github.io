(() => {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const initDrawer = () => {
    const body = document.body;
    const drawer = document.querySelector('[data-drawer]');
    const toggles = document.querySelectorAll('.js-drawer-toggle');
    const closers = document.querySelectorAll('.js-drawer-close');

    if (!drawer || !toggles.length) return;

    const closeDrawer = () => {
      body.classList.remove('drawer-open');
      drawer.setAttribute('aria-hidden', 'true');
    };

    const openDrawer = () => {
      body.classList.add('drawer-open');
      drawer.setAttribute('aria-hidden', 'false');
    };

    toggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        if (body.classList.contains('drawer-open')) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });
    });

    closers.forEach((closer) => {
      closer.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });
  };

  const initPostToc = () => {
    const tocLinks = Array.from(
      document.querySelectorAll('[data-post-toc] a[href^="#"]')
    );

    if (!tocLinks.length) return;

    const sections = tocLinks
      .map((link) => {
        const href = link.getAttribute('href');
        if (!href || href.length < 2) return null;

        const id = decodeURIComponent(href.slice(1));
        const target = document.getElementById(id);
        if (!target) return null;

        return { id, link, target };
      })
      .filter(Boolean);

    if (!sections.length) return;

    const setActive = (activeId) => {
      tocLinks.forEach((link) => {
        const href = link.getAttribute('href');
        const linkId = href ? decodeURIComponent(href.slice(1)) : '';
        link.classList.toggle('is-active', linkId === activeId);
      });
    };

    const syncActive = () => {
      const offset = window.innerWidth <= 980 ? 112 : 140;
      let activeId = sections[0].id;

      sections.forEach((section) => {
        if (window.scrollY + offset >= section.target.offsetTop) {
          activeId = section.id;
        }
      });

      setActive(activeId);
    };

    syncActive();

    window.addEventListener('scroll', syncActive, { passive: true });
    window.addEventListener('resize', syncActive);
    window.addEventListener('hashchange', syncActive);
  };

  const initReadingProgress = () => {
    const progressBar = document.querySelector('[data-reading-progress]');
    const article = document.querySelector('.article');

    if (!progressBar || !article) return;

    const syncProgress = () => {
      const start = article.offsetTop - 120;
      const end = article.offsetTop + article.offsetHeight - window.innerHeight;
      const distance = Math.max(end - start, 1);
      const progress = clamp((window.scrollY - start) / distance, 0, 1);

      progressBar.style.transform = `scaleX(${progress})`;
    };

    syncProgress();

    window.addEventListener('scroll', syncProgress, { passive: true });
    window.addEventListener('resize', syncProgress);
    window.addEventListener('hashchange', syncProgress);
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', 'readonly');
    input.style.position = 'absolute';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();

    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(input);
    }
  };

  const initCodeArea = () => {
    const codeBlocks = document.querySelectorAll('.article__content figure.highlight, .article__content pre');

    if (!codeBlocks.length) return;

    codeBlocks.forEach((block) => {
      if (block.tagName === 'PRE' && block.closest('figure.highlight')) return;
      if (block.parentNode.classList.contains('code-area')) return;

      const isHexo = block.tagName === 'FIGURE';

      const wrapper = document.createElement('div');
      wrapper.className = 'code-area';

      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(block);

      let langName = '';
      if (isHexo) {
        const classes = Array.from(block.classList);
        const langClass = classes.find(c => c !== 'highlight' && c !== 'figure');
        if (langClass) langName = langClass;
      } else {
        const codeClass = block.getAttribute('class') || block.querySelector('code')?.getAttribute('class') || '';
        langName = codeClass.replace('line-numbers', '').replace('language-', '').trim().split(' ')[0];
      }

      if (langName) {
        langName = langName.charAt(0).toUpperCase() + langName.slice(1);
        const langDiv = document.createElement('div');
        langDiv.className = 'code_lang';
        langDiv.title = '代码语言';
        langDiv.textContent = langName;
        wrapper.appendChild(langDiv);
      }

      const copyIcon = document.createElement('span');
      copyIcon.className = 'code_copy';
      copyIcon.title = '复制代码';
      copyIcon.textContent = 'copy'; 
      copyIcon.style.userSelect = 'none';

      copyIcon.addEventListener('click', async () => {
        const textToCopy = isHexo
          ? (block.querySelector('.code') || block).innerText
          : block.innerText;
        await copyText(textToCopy);
        
        copyIcon.textContent = 'copy';
        copyIcon.style.color = '#27c93f';
        setTimeout(() => {
          copyIcon.textContent = 'copy';
          copyIcon.style.color = '';
        }, 1500);
      });

      const expandIcon = document.createElement('span');
      expandIcon.className = 'code-expand';
      expandIcon.title = '折叠代码';
      expandIcon.textContent = '▼'; 
      expandIcon.style.userSelect = 'none';

      expandIcon.addEventListener('click', () => {
        wrapper.classList.toggle('code-closed');
      });

      wrapper.appendChild(copyIcon);
      wrapper.appendChild(expandIcon);
    });
  };

  const isStandaloneMedia = (node) => {
    if (!node) return false;

    const parent = node.parentElement;
    if (!parent || parent.tagName !== 'P') return true;

    const meaningfulNodes = Array.from(parent.childNodes).filter((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        return child.textContent.trim() !== '';
      }

      return true;
    });

    return meaningfulNodes.length === 1;
  };

  const getCaptionText = (img) => {
    const title = (img.getAttribute('title') || '').trim();
    const alt = (img.getAttribute('alt') || '').trim();
    const src = img.getAttribute('src') || '';
    const basename = decodeURIComponent(src.split('/').pop() || '')
      .replace(/\.[a-z0-9]+$/i, '')
      .trim()
      .toLowerCase();

    const candidate = title || alt;
    if (!candidate) return '';

    const normalized = candidate.toLowerCase();
    if (normalized === basename || normalized === `${basename}.png`) return '';

    return candidate;
  };

  const initImageCaptions = () => {
    const images = document.querySelectorAll('.article__content img');

    if (!images.length) return;

    let figureIndex = 0;

    images.forEach((img) => {
      if (img.closest('figure.article-media')) return;

      const mediaNode = img.parentElement?.tagName === 'A' ? img.parentElement : img;
      if (!isStandaloneMedia(mediaNode)) return;

      figureIndex += 1;

      const captionText = getCaptionText(img);
      const figure = document.createElement('figure');
      figure.className = 'article-media';

      const container = mediaNode.parentElement;
      const shouldReplaceParagraph =
        container?.tagName === 'P' &&
        Array.from(container.childNodes).every((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return child.textContent.trim() === '';
          }

          return child === mediaNode;
        });

      if (shouldReplaceParagraph) {
        container.parentNode.insertBefore(figure, container);
        figure.appendChild(mediaNode);
        container.remove();
      } else {
        mediaNode.parentNode.insertBefore(figure, mediaNode);
        figure.appendChild(mediaNode);
      }

      const caption = document.createElement('figcaption');
      caption.className = 'article-media__caption';

      const label = document.createElement('span');
      label.className = 'article-media__label';
      label.textContent = `图 ${String(figureIndex).padStart(2, '0')}`;
      caption.appendChild(label);

      if (captionText) {
        const text = document.createElement('span');
        text.className = 'article-media__text';
        text.textContent = `· ${captionText}`;
        caption.appendChild(text);
      }

      figure.appendChild(caption);
    });
  };

  initDrawer();
  initPostToc();
  initReadingProgress();
  initCodeArea();
  initImageCaptions();
})();