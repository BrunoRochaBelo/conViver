export function buildNavigation() {
    const navContainer = document.getElementById('mainNav');
    if (!navContainer) return;

    const isInPagesDir = window.location.pathname.includes('/pages/');
    const hrefPrefix = isInPagesDir ? '' : 'pages/';
    const layoutPrefix = isInPagesDir ? '../layout.html?page=' : 'layout.html?page=';

    const urlParams = new URLSearchParams(window.location.search);
    const queryPage = urlParams.get('page');
    const pathPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    const currentPage = queryPage || pathPage;

    const items = [
        {
            key: 'comunicacao',
            label: 'Comunicação',
            href: 'comunicacao.html',
            useLayout: true,
            icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`
        },
        {
            key: 'portaria',
            label: 'Portaria',
            href: 'portaria.html',
            useLayout: true,
            icon: `<svg class="cv-nav__icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`
        },
        {
            key: 'calendario',
            label: 'Calendário',
            href: 'calendario.html',
            useLayout: true,
            icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
        },
        {
            key: 'financeiro',
            label: 'Financeiro',
            href: 'financeiro.html',
            icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
            subItems: [
                { key: 'cobrancas', label: 'Cobranças', href: 'financeiro.html' },
                { key: 'despesas', label: 'Despesas', href: 'financeiro.html#despesas' },
                { key: 'relatorios', label: 'Relatórios', href: 'financeiro.html#relatorios' },
                { key: 'orcamento', label: 'Orçamento', href: 'financeiro.html#orcamento' },
                { key: 'tendencias', label: 'Tendências', href: 'financeiro.html#tendencias' }
            ]
        },
        {
            key: 'biblioteca',
            label: 'Arquivos',
            href: 'biblioteca.html',
            icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
        }
    ];

    const container = document.createElement('div');
    container.className = 'cv-container';
    const ul = document.createElement('ul');
    ul.className = 'cv-nav__list';

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cv-nav__item';
        const a = document.createElement('a');
        if (item.useLayout) {
            a.href = `${layoutPrefix}${item.key}`;
        } else {
            a.href = `${hrefPrefix}${item.href}`;
        }
        a.innerHTML = `${item.icon}<span class="cv-nav__label">${item.label}</span>`;
        a.className = 'cv-nav__link';
        if (currentPage === item.key) {
            a.classList.add('cv-nav__link--active');
            a.setAttribute('aria-current', 'page');
        }
        li.appendChild(a);
        ul.appendChild(li);

        if (item.subItems && (currentPage === item.key || item.subItems.some(si => si.key === currentPage))) {
            const subNav = document.createElement('div');
            subNav.className = 'cv-tabs fin-subtabs';
            item.subItems.forEach(si => {
                const subA = document.createElement('a');
                subA.href = `${hrefPrefix}${si.href}`;
                subA.className = 'cv-tab-button';
                subA.textContent = si.label;
                if (currentPage === si.key) subA.classList.add('active');
                subNav.appendChild(subA);
            });
            navContainer.appendChild(subNav);
        }
    });

    container.appendChild(ul);
    navContainer.innerHTML = '';
    navContainer.classList.add('cv-nav');

    // Hamburger button for mobile
    const hamburger = document.createElement('button');
    hamburger.className = 'cv-nav-hamburger';
    hamburger.setAttribute('aria-label', 'Abrir menu');
    hamburger.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;

    navContainer.appendChild(hamburger);
    navContainer.appendChild(container);

// Inside your navigation initialization function:

// Hamburger & Drawer setup
const hamburger = document.querySelector('.cv-nav-hamburger');
const navList = document.querySelector('.cv-nav-list');

// ▶️ Drawer element
let drawer = document.querySelector('.cv-nav--drawer');
if (!drawer) {
  drawer = document.createElement('div');
  drawer.className = 'cv-nav--drawer';
  drawer.innerHTML = '<div class="cv-nav--drawer__panel"></div>';
  document.body.appendChild(drawer);
}

const drawerPanel = drawer.querySelector('.cv-nav--drawer__panel');
drawerPanel.innerHTML = '';
drawerPanel.appendChild(navList.cloneNode(true));

function openDrawer() {
  drawer.classList.add('open');
  document.body.classList.add('cv-modal-open');
}

function closeDrawer() {
  drawer.classList.remove('open');
  document.body.classList.remove('cv-modal-open');
}

// wire up drawer events
hamburger.addEventListener('click', openDrawer);
drawer.addEventListener('click', e => {
  if (e.target === drawer) closeDrawer();
});
drawerPanel.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', closeDrawer);
});

// ▶️ Bottom navigation bar (mobile-only, if enabled)
if (
  window.innerWidth < 768 &&
  window.APP_CONFIG?.ENABLE_MOBILE_BOTTOM_NAV
) {
  const bottomNav = document.createElement('nav');
  bottomNav.className = 'cv-bottom-nav';

  const bottomUl = document.createElement('ul');
  bottomUl.className = 'cv-bottom-nav__list';

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'cv-bottom-nav__item';

    const a = document.createElement('a');
    a.className = 'cv-bottom-nav__link';
    a.innerHTML = item.icon;

    // escolhe URL conforme layoutPrefix ou hrefPrefix
    a.href = item.useLayout
      ? `${layoutPrefix}${item.key}`
      : `${hrefPrefix}${item.href}`;

    if (currentPage === item.key) {
      a.classList.add('cv-bottom-nav__link--active');
      a.setAttribute('aria-current', 'page');
    }

    li.appendChild(a);
    bottomUl.appendChild(li);
  });

  bottomNav.appendChild(bottomUl);
  document.body.appendChild(bottomNav);
}


document.addEventListener('DOMContentLoaded', buildNavigation);
