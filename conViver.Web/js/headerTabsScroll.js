export function initHeaderTabsScroll() {
  const header = document.querySelector('.cv-header');
  if (!header) return;

  const pageMain = document.getElementById('pageMain');
  if (!pageMain) return;

  function attachListener(tabsEl, scrollContainer) {
    let lastScroll = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
    let isHeaderHidden = false;
    const threshold = 10;

    function update() {
      const current = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
      const delta = current - lastScroll;
      if (Math.abs(delta) <= threshold) return;

      if (delta > 0 && current > header.offsetHeight) {
        if (!isHeaderHidden) {
          header.classList.add('cv-header--hidden');
          tabsEl.classList.add('cv-tabs--fixed');
          isHeaderHidden = true;
        }
      } else if (delta < 0 || current <= 0) {
        if (isHeaderHidden) {
          header.classList.remove('cv-header--hidden');
          tabsEl.classList.remove('cv-tabs--fixed');
          isHeaderHidden = false;
        }
      }
      lastScroll = current;
    }

    let ticking = false;
    scrollContainer.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          update();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  function tryInit() {
    let tabsEl = pageMain.querySelector('.cv-tabs');
    let scrollContainer = window;
    if (!tabsEl) {
      tabsEl = pageMain.querySelector('.cv-tab-content');
      scrollContainer = tabsEl || window;
    }

    if (tabsEl) {
      attachListener(tabsEl, scrollContainer);
      return true;
    }
    return false;
  }

  if (!tryInit()) {
    const observer = new MutationObserver(() => {
      if (tryInit()) {
        observer.disconnect();
      }
    });
    observer.observe(pageMain, { childList: true, subtree: true });
  }
}
