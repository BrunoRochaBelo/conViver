export function initHeaderTabsScroll() {
  const header = document.querySelector('.cv-header');
  if (!header) return;

  const pageMain = document.getElementById('pageMain');
  if (!pageMain) return;

  function attachListener(tabsEl, scrollContainer) {
    let lastScrollY = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
    // headerState can be 'default', 'hidden', 'floating'
    let headerState = 'default';
    const threshold = 5; // Reduced threshold for quicker response
    let headerHeight = header.offsetHeight;

    // Function to update header height (e.g., if it changes dynamically)
    function updateHeaderHeight() {
        // Ensure we get the correct height, considering box-sizing and potential margins
        const styles = window.getComputedStyle(header);
        headerHeight = header.offsetHeight + parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
    }
    // Initial header height
    updateHeaderHeight();


    function update() {
      const currentScrollY = scrollContainer === window ? window.scrollY : scrollContainer.scrollTop;
      const scrollDelta = currentScrollY - lastScrollY;

      // Update header height dynamically in case of window resize or content change
      // This might be too frequent; consider debouncing or observing resize if performance issues arise.
      updateHeaderHeight();

      // At the very top of the page
      if (currentScrollY <= 0) {
        if (headerState !== 'default') {
          header.classList.remove('cv-header--hidden', 'cv-header--floating');
          tabsEl.classList.remove('cv-tabs--fixed');
          tabsEl.style.paddingTop = ''; // Reset padding/margin for tabs
          headerState = 'default';
        }
      } else {
        // Scrolling down
        if (scrollDelta > threshold) {
          if (headerState !== 'floating') {
            header.classList.remove('cv-header--hidden');
            header.classList.add('cv-header--floating');
            tabsEl.classList.add('cv-tabs--fixed');
            // Adjust tabs position to be below the floating header
            tabsEl.style.paddingTop = `${headerHeight}px`;
            headerState = 'floating';
          }
        }
        // Scrolling up
        else if (scrollDelta < -threshold) {
          // If scrolling up and header is floating, it remains floating.
          // If it was hidden, it remains hidden (until scroll down or top).
          // If it was default (only possible if currentScrollY became > 0 without significant delta),
          // then it should transition to hidden or floating based on new logic.

          // The new requirement: header appears on scroll down and stays.
          // It only hides if user scrolls up *before* it became floating,
          // or if we explicitly want it to hide on scroll up when not at top.
          // For now, let's stick to: if it's floating, it stays floating when scrolling up.
          // If it's 'default' and we scrolled down a bit (currentScrollY > 0 but not enough for floating yet)
          // and then scroll up, it should hide.
          if (headerState === 'default' && currentScrollY > headerHeight) {
            // This case handles if we scrolled down a bit from top, then immediately up
            // header.classList.add('cv-header--hidden');
            // tabsEl.classList.add('cv-tabs--fixed');
            // tabsEl.style.paddingTop = ''; // Tabs fixed to viewport top
            // headerState = 'hidden';
            // On second thought, the new requirement is simpler:
            // Header becomes floating on any scroll down (not 0), and stays.
            // It only hides if scrolling up *when it was already hidden*.
            // The original logic for hiding:
            // header.classList.add('cv-header--hidden');
            // tabsEl.classList.add('cv-tabs--fixed');
            // headerState = 'hidden';
            // The new behavior: if scrolling up, and header is floating, it stays floating.
            // If not floating, and we are not at the top, it should become floating.
            // This means the "hidden" state is only achieved if current logic for hiding is maintained
            // for upward scrolls when header isn't already floating.
            // Let's simplify: if scrolling up and not at top, and not floating, make it floating.
            // This ensures header is visible as long as not at scrollY = 0.
             if (headerState !== 'floating') {
                header.classList.remove('cv-header--hidden');
                header.classList.add('cv-header--floating');
                tabsEl.classList.add('cv-tabs--fixed');
                tabsEl.style.paddingTop = `${headerHeight}px`;
                headerState = 'floating';
             }
          }
        }
      }
      lastScrollY = currentScrollY;
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

    // Also listen for resize to update header height, as it might change with viewport
    // Debounce resize listener for performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateHeaderHeight();
            // Re-apply styles if header is floating, as its height might have changed
            if (headerState === 'floating') {
                tabsEl.style.paddingTop = `${headerHeight}px`;
            }
        }, 100);
    });
  }

  function tryInit() {
    const tabsEl = pageMain.querySelector('.cv-tabs');
    // The scroll container should always be window for this global header behavior.
    const scrollContainer = window;

    if (tabsEl) {
      attachListener(tabsEl, scrollContainer);
      return true;
    }
    return false;
  }

  // Initial check
  if (!tryInit()) {
    // If tabs are not immediately available (e.g. loaded dynamically), observe mutations
    const observer = new MutationObserver((mutationsList, obs) => {
      const tabsEl = pageMain.querySelector('.cv-tabs');
      if (tabsEl) {
        if (tryInit()) {
          obs.disconnect(); // Stop observing once initialized
        }
      }
    });
    observer.observe(pageMain, { childList: true, subtree: true });
  }
}
