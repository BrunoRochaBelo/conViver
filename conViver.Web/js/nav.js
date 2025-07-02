// --- Common Navigation Data ---
const navItems = [
    {
        key: 'comunicacao',
        label: 'Comunicação',
        href: 'comunicacao.html',
        useLayout: true,
        icon: `<svg class="cv-nav__icon mobile-nav-menu__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`
    },
    {
        key: 'portaria',
        label: 'Portaria',
        href: 'portaria.html',
        useLayout: true,
        icon: `<svg class="cv-nav__icon mobile-nav-menu__icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`
    },
    {
        key: 'calendario',
        label: 'Calendário',
        href: 'calendario.html',
        useLayout: true,
        icon: `<svg class="cv-nav__icon mobile-nav-menu__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
    },
    {
        key: 'financeiro',
        label: 'Financeiro',
        href: 'financeiro.html',
        icon: `<svg class="cv-nav__icon mobile-nav-menu__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
        subItems: [ // Sub-items for financeiro, will be handled by financeiro.js or similar
            { key: 'cobrancas', label: 'Cobranças', hrefFragment: '#cobrancas' }, // Example, adjust as needed
            { key: 'despesas', label: 'Despesas', hrefFragment: '#despesas' },
        ]
    },
    {
        key: 'biblioteca',
        label: 'Arquivos',
        href: 'biblioteca.html',
        icon: `<svg class="cv-nav__icon mobile-nav-menu__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
    }
];

function getCurrentPageInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    const queryPage = urlParams.get('page');
    const pathSegments = window.location.pathname.split('/');
    const htmlFile = pathSegments.pop();
    const pathPage = htmlFile.endsWith('.html') ? htmlFile.replace('.html', '') : (pathSegments.includes('pages') ? 'index' : htmlFile || 'index');
    const isInPagesDir = window.location.pathname.includes('/pages/');
    const hrefPrefix = isInPagesDir ? '' : 'pages/';
    const layoutPrefix = isInPagesDir ? '../layout.html?page=' : 'layout.html?page=';

    return {
        currentPageKey: queryPage || pathPage,
        hrefPrefix,
        layoutPrefix
    };
}


// --- Desktop Navigation ---
function buildDesktopNavigation() {
    const navContainer = document.getElementById('mainNav');
    if (!navContainer) return;

    const { currentPageKey, hrefPrefix, layoutPrefix } = getCurrentPageInfo();

    const ul = document.createElement('ul');
    ul.className = 'cv-nav__list';

    navItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cv-nav__item';
        const a = document.createElement('a');

        let targetHref = item.useLayout ? `${layoutPrefix}${item.key}` : `${hrefPrefix}${item.href}`;
        // For financeiro, the main link goes to the default subpage (e.g., cobrancas)
        if (item.key === 'financeiro' && item.subItems && item.subItems.length > 0) {
             targetHref = item.useLayout ? `${layoutPrefix}${item.key}` : `${hrefPrefix}${item.href}`;
        }

        a.href = targetHref;
        a.innerHTML = `${item.icon ? item.icon.replace('mobile-nav-menu__icon', '') : ''}<span class="cv-nav__label">${item.label}</span>`; // Remove mobile class for desktop icon
        a.className = 'cv-nav__link';

        if (currentPageKey === item.key || (item.key === 'financeiro' && currentPageKey.startsWith('financeiro'))) {
            a.classList.add('cv-nav__link--active');
            a.setAttribute('aria-current', 'page');
        }
        li.appendChild(a);
        ul.appendChild(li);
    });

    navContainer.innerHTML = ''; // Clear previous content
    navContainer.appendChild(ul); // Append the new list
}

// --- Mobile Navigation ---
function buildMobileNavigation() {
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    if (!mobileNavMenu) return;

    const { currentPageKey, hrefPrefix, layoutPrefix } = getCurrentPageInfo();

    const ul = document.createElement('ul');
    ul.className = 'mobile-nav-menu__list';
    ul.setAttribute('role', 'menu');

    navItems.forEach(item => {
        const li = document.createElement('li');
        li.setAttribute('role', 'none');
        const a = document.createElement('a');

        let targetHref = item.useLayout ? `${layoutPrefix}${item.key}` : `${hrefPrefix}${item.href}`;
        if (item.key === 'financeiro' && item.subItems && item.subItems.length > 0) {
            targetHref = item.useLayout ? `${layoutPrefix}${item.key}` : `${hrefPrefix}${item.href}`;
        }

        a.href = targetHref;
        a.innerHTML = `${item.icon || ''}<span class="mobile-nav-menu__label">${item.label}</span>`;
        a.className = 'mobile-nav-menu__link';
        a.setAttribute('role', 'menuitem');

        if (currentPageKey === item.key || (item.key === 'financeiro' && currentPageKey.startsWith('financeiro'))) {
            a.classList.add('mobile-nav-menu__link--active');
            a.setAttribute('aria-current', 'page');
        }
        li.appendChild(a);
        ul.appendChild(li);
    });
    mobileNavMenu.innerHTML = ''; // Clear previous
    mobileNavMenu.appendChild(ul);
}

function setupMobileMenuToggle() {
    const toggleButton = document.getElementById('mobileMenuToggle');
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const overlay = document.getElementById('mobileNavOverlay');

    if (toggleButton && mobileNavMenu && overlay) {
        toggleButton.addEventListener('click', () => {
            const isOpen = mobileNavMenu.classList.toggle('open');
            overlay.classList.toggle('open', isOpen);
            toggleButton.setAttribute('aria-expanded', isOpen.toString());
            mobileNavMenu.setAttribute('aria-hidden', (!isOpen).toString());
            // Basic focus trapping could be added here for accessibility
        });

        overlay.addEventListener('click', () => {
            mobileNavMenu.classList.remove('open');
            overlay.classList.remove('open');
            toggleButton.setAttribute('aria-expanded', 'false');
            mobileNavMenu.setAttribute('aria-hidden', 'true');
        });
    }
}


// --- Sub-Navigation (Tabs, e.g., for Financeiro) ---
// This part needs to be more dynamic based on the current page.
// For now, it's a simplified version assuming financeiro.js or page-specific logic handles sub-tab rendering.
function buildSubNavigationIfApplicable() {
    const { currentPageKey, hrefPrefix } = getCurrentPageInfo();
    const financeItem = navItems.find(item => item.key === 'financeiro');

    if (currentPageKey.startsWith('financeiro') && financeItem && financeItem.subItems) {
        let mainContentArea = document.getElementById('pageMain');
        // If mainNav is where subtabs should go (unlikely for true subtabs, more for page sections)
        // let navContainer = document.getElementById('mainNav');

        // It's more common for subtabs to be part of the page content area.
        // This example assumes a div with id="subNavContainer" exists on financeiro.html
        const subNavContainer = document.getElementById('subNavContainer');
        if (!subNavContainer) return;

        const subNav = document.createElement('div');
        subNav.className = 'cv-tabs fin-subtabs'; // Use existing tab styling

        financeItem.subItems.forEach(si => {
            const subA = document.createElement('a');
            // Sub-item hrefs might be fragments or full paths depending on routing strategy
            subA.href = `${hrefPrefix}${financeItem.href}${si.hrefFragment || ''}`;
            subA.className = 'cv-tab-button';
            subA.textContent = si.label;
            // Logic to determine active sub-tab based on URL fragment or specific sub-page key
            if (window.location.hash === si.hrefFragment || currentPageKey === si.key) {
                subA.classList.add('active');
            }
            subNav.appendChild(subA);
        });
        subNavContainer.innerHTML = ''; // Clear previous
        subNavContainer.appendChild(subNav);
    }
}


// --- Initialization ---
function initializeNavigation() {
    buildDesktopNavigation();
    buildMobileNavigation();
    setupMobileMenuToggle();
    // buildSubNavigationIfApplicable(); // Call if sub-navigation is managed globally here
}

document.addEventListener('DOMContentLoaded', initializeNavigation);
