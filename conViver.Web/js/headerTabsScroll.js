// conViver.Web/js/headerTabsScroll.js
export function initReactiveHeader() {
    const headerEl = document.querySelector('.cv-header');
    if (!headerEl) {
        // console.warn("Reactive Header: .cv-header not found.");
        return;
    }

    const pageMain = document.getElementById('pageMain');
    if (!pageMain) {
        // console.warn("Reactive Header: #pageMain not found.");
        return;
    }

    let tabsEl = null;
    let lastScrollY = window.scrollY;
    const scrollThreshold = 10; // Min scroll diff to react, avoids jitter
    let ticking = false;

    function handleScroll() {
        const currentScrollY = window.scrollY;
        // const currentHeaderHeight = headerEl.offsetHeight; // Not strictly needed for this logic version
        const scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';

        // Debounce/threshold logic: only react if scroll is significant or if we are near the top
        if (Math.abs(currentScrollY - lastScrollY) <= scrollThreshold && currentScrollY > scrollThreshold) {
            lastScrollY = currentScrollY; // Still update lastScrollY to prevent large delta on next significant scroll
            return; // Exit if scroll change is too small and not at top
        }

        // State 1: At the very top of the page (scrollY <= scrollThreshold) - Reset to initial
        if (currentScrollY <= scrollThreshold) {
            headerEl.style.position = ''; // Revert to CSS default (sticky)
            headerEl.classList.remove('header-is-fixed-visible');
            headerEl.classList.remove('cv-header--hidden');

            if (tabsEl) {
                tabsEl.classList.remove('tabs-are-pushed-by-header');
                tabsEl.classList.remove('cv-tabs--fixed');
                tabsEl.classList.remove('tabs-fixed-under-header'); // Ensure this is cleaned up if it was ever used
            }
        }
        // State 2: Scrolling Down (scrollY > scrollThreshold) - Header hides, Tabs stick to viewport top
        else if (scrollDirection === 'down') {
            // Hide header if it's not already hidden
            // The condition currentScrollY > currentHeaderHeight is implicitly handled by being in this 'else' block
            // and the fact that we hide it.
            if (!headerEl.classList.contains('cv-header--hidden')) {
                headerEl.style.position = 'fixed'; // Ensure fixed for smooth slide out animation
                headerEl.classList.add('cv-header--hidden');
                headerEl.classList.remove('header-is-fixed-visible');

                if (tabsEl) {
                    tabsEl.classList.add('cv-tabs--fixed'); // Tabs stick to viewport top
                    tabsEl.classList.remove('tabs-are-pushed-by-header');
                    tabsEl.classList.remove('tabs-fixed-under-header');
                }
            }
        }
        // State 3: Scrolling Up (scrollY > scrollThreshold) - Header appears, Tabs are pushed down
        else if (scrollDirection === 'up' && currentScrollY > scrollThreshold) {
            // Show header if it's not already visible and fixed
            if (!headerEl.classList.contains('header-is-fixed-visible')) {
                headerEl.style.position = 'fixed'; // Ensure fixed for smooth slide in animation
                headerEl.classList.add('header-is-fixed-visible');
                headerEl.classList.remove('cv-header--hidden');

                if (tabsEl) {
                    tabsEl.classList.add('tabs-are-pushed-by-header'); // Push tabs below the now visible fixed header
                    tabsEl.classList.remove('cv-tabs--fixed'); // Remove top-of-viewport fixing
                    tabsEl.classList.remove('tabs-fixed-under-header');
                }
            }
        }

        lastScrollY = currentScrollY;
    }

    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    }

    // Function to find tabs and attach scroll listener
    function tryInitAndAttachListener() {
        const currentTabs = pageMain.querySelector('.cv-tabs');
        tabsEl = currentTabs;

        if (!tabsEl) {
             tabsEl = pageMain.querySelector('.cv-tab-content');
             // if (tabsEl) console.warn("Reactive Header: .cv-tabs not found, using .cv-tab-content. Styling might be affected.");
        }

        if (tabsEl) {
            lastScrollY = window.scrollY;
            handleScroll(); // Initial check in case page loads scrolled
            window.addEventListener('scroll', onScroll, { passive: true });
            // console.log("Reactive Header (Corrected Logic): Initialized with tabs element:", tabsEl);
            return true;
        }
        // console.log("Reactive Header (Corrected Logic): Tabs element not found for initialization.");
        return false;
    }

    if (!tryInitAndAttachListener()) {
        const observer = new MutationObserver((mutationsList, obs) => {
            if (pageMain.querySelector('.cv-tabs') || pageMain.querySelector('.cv-tab-content')) {
                if (tryInitAndAttachListener()) {
                    obs.disconnect();
                }
            }
        });
        observer.observe(pageMain, { childList: true, subtree: true });
    }
}
