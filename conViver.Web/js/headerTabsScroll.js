// conViver.Web/js/headerTabsScroll.js

let isHeaderScrollListenerAttached = false;
let cvHeader, cvTabs, mainContent; // Keep references accessible
let lastScrollY = 0; // Initialize lastScrollY
let ticking = false; // For scroll debouncing

const headerFloatingClass = "cv-header--floating";
const headerHiddenClass = "cv-header--hidden-on-scroll-up";
const tabsBelowHeaderClass = "cv-tabs--below-header";
const tabsFixedClass = "cv-tabs--fixed-top";

function updateHeaderStylesLogic() {
  if (!cvHeader) return; // cvHeader must exist

  const currentScrollY = window.scrollY;
  const isScrollingDown = currentScrollY > lastScrollY;
  const scrollThreshold = 5;

  if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold && currentScrollY !== 0) {
    lastScrollY = currentScrollY;
    return;
  }

  const headerHeight = cvHeader.offsetHeight;
  const tabsHeight = cvTabs ? cvTabs.offsetHeight : 0;

  if (currentScrollY === 0) {
    cvHeader.classList.remove(headerFloatingClass, headerHiddenClass);
    cvHeader.style.transform = '';

    if (cvTabs) {
      cvTabs.classList.remove(tabsBelowHeaderClass, tabsFixedClass);
      cvTabs.style.top = "";
    }
    if (mainContent) {
      mainContent.style.paddingTop = "";
    }
  } else if (isScrollingDown) {
    cvHeader.classList.remove(headerHiddenClass);
    cvHeader.classList.add(headerFloatingClass);
    cvHeader.style.transform = 'translateY(0%)';

    if (cvTabs) {
      cvTabs.classList.add(tabsBelowHeaderClass);
      cvTabs.classList.remove(tabsFixedClass);
      cvTabs.style.top = headerHeight + 'px';
    }
    if (mainContent) {
      mainContent.style.paddingTop = (headerHeight + (cvTabs ? tabsHeight : 0)) + 'px';
    }
  } else { // Scrolling Up and currentScrollY > 0
    cvHeader.classList.add(headerHiddenClass);
    // cvHeader.classList.add(headerFloatingClass); // Ensure it's floating to transform correctly even if it wasn't on screen before scrolling up
    if (!cvHeader.classList.contains(headerFloatingClass)) { // If it wasn't floating (e.g. scrolled down then immediately up very fast from near top)
        cvHeader.classList.add(headerFloatingClass);
    }


    if (cvTabs) {
      cvTabs.classList.remove(tabsBelowHeaderClass);
      cvTabs.classList.add(tabsFixedClass);
      cvTabs.style.top = "0px";
      if (mainContent) {
        mainContent.style.paddingTop = tabsHeight + 'px';
      }
    } else if (mainContent) {
      mainContent.style.paddingTop = "0px";
    }
  }
  lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
}

function onScroll() {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateHeaderStylesLogic();
      ticking = false;
    });
    ticking = true;
  }
}

export function initHeaderTabsScroll() {
  // Query elements every time, as they might be added/removed by pageLoader
  cvHeader = document.querySelector('.cv-header');
  cvTabs = document.querySelector('.cv-tabs');
  mainContent = document.getElementById('pageMain');

  if (!cvHeader) {
    // console.warn('CV Header not found, scroll behavior aborted for this call.');
    return;
  }

  // Ensure event listener is attached only once
  if (!isHeaderScrollListenerAttached) {
    window.addEventListener('scroll', onScroll);
    isHeaderScrollListenerAttached = true;
    console.log('HeaderTabsScroll: Scroll listener attached.');
  }

  // Always update styles on init to handle page load state (e.g. if page loaded scrolled)
  // or if tabs appear/disappear after page navigation
  lastScrollY = window.scrollY; // Ensure lastScrollY is current before first update
  updateHeaderStylesLogic();

  // console.log('HeaderTabsScroll initialized/re-initialized.');
}

// The script is imported as a module in layout.html.
// Its initHeaderTabsScroll function will be called by pageLoader.js
// and also directly via the script tag in layout.html if no page is loaded by pageLoader (e.g. initial direct load of index.html or login.html)
// To ensure it runs on initial load of pages that DON'T use pageLoader (like login.html, or index.html if it doesn't immediately redirect/load another page via pageLoader):
// We can call it once the script is loaded if not handled by a more specific loader.
// However, pageLoader.js also calls it on DOMContentLoaded for the initial page.
// The import in layout.html will make initHeaderTabsScroll available.
// The pageLoader.js handles the DOMContentLoaded case for pages it loads.
// For direct loads of index.html or login.html, they should ideally call this themselves if they need it,
// or we rely on a simple direct call when this module is first parsed if those pages are very simple.

// For simplicity and to ensure it runs at least once after the script is loaded and DOM is likely ready
// for pages not managed by pageLoader.js's initial load:
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderTabsScroll);
} else {
    // DOMContentLoaded has already fired or script is deferred
    initHeaderTabsScroll();
}
