export function initHeaderScroll() {
    const header = document.querySelector('header.cv-header');
    if (!header) return;

    const mainNav = document.getElementById('mainNav');
    const tabs = document.querySelector('.cv-tabs');
    const scrollElement = document.getElementById('pageMain') || window;
    const threshold = 5;

    function getScrollTop() {
        return scrollElement === window ? window.scrollY : scrollElement.scrollTop;
    }

    function setSticky(element, offset) {
        if (!element) return;
        element.classList.add('cv-sticky-under-header');
        element.style.top = offset + 'px';
    }

    function clearSticky(element) {
        if (!element) return;
        element.classList.remove('cv-sticky-under-header');
        element.style.top = '';
    }

    function update() {
        const scrolled = getScrollTop() > threshold;
        const isWide = window.innerWidth >= 768;

        if (scrolled) {
            header.classList.add('cv-header--compact');
            const headerHeight = header.getBoundingClientRect().height;

            if (isWide) {
                setSticky(mainNav, headerHeight);
                if (tabs) {
                    const navHeight = mainNav ? mainNav.getBoundingClientRect().height : 0;
                    setSticky(tabs, headerHeight + navHeight);
                }
            } else {
                clearSticky(mainNav);
                if (tabs) setSticky(tabs, headerHeight);
            }
        } else {
            header.classList.remove('cv-header--compact');
            clearSticky(mainNav);
            clearSticky(tabs);
        }
    }

    scrollElement.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
}

document.addEventListener('DOMContentLoaded', initHeaderScroll);
