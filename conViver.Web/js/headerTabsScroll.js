export function initHeaderTabsScroll() {
  const header = document.querySelector('.cv-header');
  if (!header) return;

  const pageMain = document.getElementById('pageMain');
  if (!pageMain) return;

  function attachListener(tabsEl, scrollContainer) {
    let lastScroll = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
    let isHeaderHidden = false;
    let areTabsFixed = false;
    const threshold = 10;

    function update() {
      const current = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
      const delta = current - lastScroll;
      if (Math.abs(delta) <= threshold) return;

      if (current === 0) {
        if (areTabsFixed) {
          tabsEl.classList.remove('cv-tabs--fixed');
          areTabsFixed = false;
        }
        if (isHeaderHidden) {
          header.classList.remove('cv-header--hidden');
          isHeaderHidden = false;
        }
      } else if (delta > 0) {
        if (!areTabsFixed) {
          tabsEl.classList.add('cv-tabs--fixed');
          areTabsFixed = true;
        }
        if (!isHeaderHidden) {
          header.classList.add('cv-header--hidden');
          isHeaderHidden = true;
        }
      } else if (delta < 0) {
        if (!areTabsFixed) {
          tabsEl.classList.add('cv-tabs--fixed');
          areTabsFixed = true;
        }
        if (isHeaderHidden) {
          header.classList.remove('cv-header--hidden');
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
