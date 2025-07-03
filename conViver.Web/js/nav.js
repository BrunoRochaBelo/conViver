export function buildNavigation() {
    const navContainer = document.getElementById('mainNav');
    if (!navContainer) return;

    const isInPagesDir = window.location.pathname.includes('/pages/');
    const hrefPrefix = isInPagesDir ? '' : 'pages/';
    const layoutPrefix = isInPagesDir ? '../layout.html?page=' : 'layout.html?page=';

    const urlParams = new URLSearchParams(window.location.search);
    const queryPage = urlParams.get('page');
    const pathName = window.location.pathname.split('/').pop();
    const pathPage = pathName === 'layout.html' ? queryPage : pathName.replace('.html', '') || 'index';
    const currentPage = pathPage;

    const items = [
        {
            key: 'comunicacao',
            label: 'Comunicação',
            href: 'comunicacao.html', // Usado para href se não for layout
            pageKey: 'comunicacao',   // Usado para query param e lógica de 'active'
            useLayout: true,
            icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`
        },
        {
            key: 'portaria',
            label: 'Portaria',
            href: 'portaria.html',
            pageKey: 'portaria',
            useLayout: true,
            icon: `<svg class="cv-nav__icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`
        },
        {
            key: 'calendario',
            label: 'Calendário',
            href: 'calendario.html',
            pageKey: 'calendario',
            useLayout: true,
            icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
        },
        {
            key: 'financeiro',
            label: 'Financeiro',
            href: 'financeiro.html', // href para o arquivo raiz da seção
            pageKey: 'financeiro',
            useLayout: false, // Financeiro é uma página standalone, não usa layout.html?page=
            icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
            // subItems são para as abas internas da página Financeiro, tratadas por financeiro.js
        },
        {
            key: 'biblioteca',
            label: 'Arquivos',
            href: 'biblioteca.html',
            pageKey: 'biblioteca',
            useLayout: true,
            icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
        }
    ];

    // --- Criação da Navegação Principal (Desktop) ---
    const desktopNavWrapper = document.createElement('div');
    desktopNavWrapper.className = 'cv-container';
    const desktopUl = document.createElement('ul');
    desktopUl.className = 'cv-nav__list';

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cv-nav__item';
        const a = document.createElement('a');
        if (item.useLayout) {
            a.href = `${layoutPrefix}${item.pageKey}`;
        } else {
            a.href = `${hrefPrefix}${item.href}`;
        }
        a.innerHTML = `${item.icon || ''}<span class="cv-nav__label">${item.label}</span>`;
        a.className = 'cv-nav__link';
        if (currentPage === item.pageKey) {
            a.classList.add('cv-nav__link--active');
            a.setAttribute('aria-current', 'page');
        }
        li.appendChild(a);
        desktopUl.appendChild(li);
    });

    desktopNavWrapper.appendChild(desktopUl);
    navContainer.innerHTML = '';
    navContainer.classList.add('cv-nav');
    navContainer.appendChild(desktopNavWrapper);


    // --- Criação do Botão Hambúrguer e Menu Drawer (Mobile) ---
    const headerContainer = document.querySelector('.cv-header .cv-header__container');
    if (!headerContainer) {
        console.error("Header container não encontrado para adicionar botão hambúrguer.");
    } else {
        let hamburgerButton = document.getElementById('hamburgerButton');
        if (!hamburgerButton) {
            hamburgerButton = document.createElement('button');
            hamburgerButton.id = 'hamburgerButton';
            hamburgerButton.className = 'cv-nav-hamburger';
            hamburgerButton.setAttribute('aria-label', 'Abrir menu');
            hamburgerButton.setAttribute('aria-expanded', 'false');
            hamburgerButton.setAttribute('aria-controls', 'mobileNavDrawer');
            hamburgerButton.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;

            const userMenuButton = document.getElementById('userMenuButton');
            if (userMenuButton) {
                headerContainer.insertBefore(hamburgerButton, userMenuButton);
            } else {
                headerContainer.appendChild(hamburgerButton);
            }
        }

        let drawer = document.getElementById('mobileNavDrawer');
        if (!drawer) {
            drawer = document.createElement('div');
            drawer.className = 'cv-nav--drawer';
            drawer.id = 'mobileNavDrawer';
            drawer.setAttribute('aria-hidden', 'true');

            const drawerPanel = document.createElement('div');
            drawerPanel.className = 'cv-nav--drawer__panel';

            const drawerHeader = document.createElement('div');
            drawerHeader.className = 'cv-nav--drawer__header';
            drawerHeader.innerHTML = `<h2>Menu</h2><button class="cv-modal-close js-drawer-close" aria-label="Fechar menu">&times;</button>`;
            drawerPanel.appendChild(drawerHeader);

            const drawerUl = document.createElement('ul');
            drawerUl.className = 'cv-nav--drawer__list';
            items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'cv-nav--drawer__item';
                const a = document.createElement('a');
                if (item.useLayout) {
                    a.href = `${layoutPrefix}${item.pageKey}`;
                } else {
                    a.href = `${hrefPrefix}${item.href}`;
                }
                a.innerHTML = `${item.icon ? item.icon.replace('cv-nav__icon', 'cv-nav--drawer__icon') : ''}<span class="cv-nav--drawer__label">${item.label}</span>`;
                a.className = 'cv-nav--drawer__link';
                if (currentPage === item.pageKey) {
                    a.classList.add('active');
                    a.setAttribute('aria-current', 'page');
                }
                a.addEventListener('click', closeDrawer); // Fechar drawer ao clicar no link
                li.appendChild(a);
                drawerUl.appendChild(li);
            });
            drawerPanel.appendChild(drawerUl);
            drawer.appendChild(drawerPanel);
            document.body.appendChild(drawer);

            hamburgerButton.addEventListener('click', () => {
                drawer.classList.add('open');
                hamburgerButton.setAttribute('aria-expanded', 'true');
                drawer.setAttribute('aria-hidden', 'false');
                document.body.classList.add('cv-modal-open');
            });

            const closeDrawerButton = drawerHeader.querySelector('.js-drawer-close');
            closeDrawerButton.addEventListener('click', closeDrawer);
            drawer.addEventListener('click', (event) => {
                if (event.target === drawer) {
                    closeDrawer();
                }
            });
        }
    }

    function closeDrawer() {
        const drawer = document.getElementById('mobileNavDrawer');
        const hamburger = document.getElementById('hamburgerButton');
        if (drawer && drawer.classList.contains('open')) {
            drawer.classList.remove('open');
            if(hamburger) hamburger.setAttribute('aria-expanded', 'false');
            drawer.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('cv-modal-open');
        }
    }


    // --- Criação da Bottom Navigation (Mobile) ---
    const existingBottomNav = document.querySelector('.cv-bottom-nav');
    if (existingBottomNav) existingBottomNav.remove(); // Remover se já existir para reconstruir

    if (window.innerWidth < 768 && window.APP_CONFIG?.ENABLE_MOBILE_BOTTOM_NAV) {
        const bottomNav = document.createElement('nav');
        bottomNav.className = 'cv-bottom-nav';
        const bottomUl = document.createElement('ul');
        bottomUl.className = 'cv-bottom-nav__list';

        items.slice(0, 5).forEach(item => {
            const li = document.createElement('li');
            li.className = 'cv-bottom-nav__item';
            const a = document.createElement('a');
            if (item.useLayout) {
                a.href = `${layoutPrefix}${item.pageKey}`;
            } else {
                a.href = `${hrefPrefix}${item.href}`;
            }
            a.innerHTML = `${item.icon ? item.icon.replace('cv-nav__icon', 'cv-bottom-nav__icon') : ''}<span class="cv-bottom-nav__label">${item.label}</span>`;
            a.className = 'cv-bottom-nav__link';
            if (currentPage === item.pageKey) {
                a.classList.add('cv-bottom-nav__link--active');
                a.setAttribute('aria-current', 'page');
            }
            li.appendChild(a);
            bottomUl.appendChild(li);
        });
        bottomNav.appendChild(bottomUl);
        document.body.appendChild(bottomNav);

        document.body.classList.add('has-bottom-nav'); // Adiciona classe para padding
    } else {
        document.body.classList.remove('has-bottom-nav'); // Remove classe se não tiver bottom-nav
    }
}

document.addEventListener('DOMContentLoaded', buildNavigation);

// Atualizar navegação em redimensionamento para mostrar/esconder bottom-nav e ajustar padding
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Apenas reconstruir a bottom-nav e o padding do body, não o header inteiro ou drawer.
        const existingBottomNav = document.querySelector('.cv-bottom-nav');
        if (existingBottomNav) existingBottomNav.remove();
        document.body.classList.remove('has-bottom-nav');

        if (window.innerWidth < 768 && window.APP_CONFIG?.ENABLE_MOBILE_BOTTOM_NAV) {
            // Recriar bottom-nav (lógica similar à de buildNavigation)
            const isInPagesDir = window.location.pathname.includes('/pages/');
            const hrefPrefix = isInPagesDir ? '' : 'pages/';
            const layoutPrefix = isInPagesDir ? '../layout.html?page=' : 'layout.html?page=';
            const urlParams = new URLSearchParams(window.location.search);
            const queryPage = urlParams.get('page');
            const pathName = window.location.pathname.split('/').pop();
            const pathPage = pathName === 'layout.html' ? queryPage : pathName.replace('.html', '') || 'index';
            const currentPage = pathPage;
            const items = [ // Redefinir items aqui ou pegar de uma fonte comum
                { key: 'comunicacao', label: 'Comunicação', href: 'comunicacao.html', pageKey: 'comunicacao', useLayout: true, icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>` },
                { key: 'portaria', label: 'Portaria', href: 'portaria.html', pageKey: 'portaria', useLayout: true, icon: `<svg class="cv-nav__icon" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>` },
                { key: 'calendario', label: 'Calendário', href: 'calendario.html', pageKey: 'calendario', useLayout: true, icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
                { key: 'financeiro', label: 'Financeiro', href: 'financeiro.html', pageKey: 'financeiro', useLayout: false, icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>` },
                { key: 'biblioteca', label: 'Arquivos', href: 'biblioteca.html', pageKey: 'biblioteca', useLayout: true, icon: `<svg class="cv-nav__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>` }
            ];
            const bottomNav = document.createElement('nav');
            bottomNav.className = 'cv-bottom-nav';
            const bottomUl = document.createElement('ul');
            bottomUl.className = 'cv-bottom-nav__list';
            items.slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.className = 'cv-bottom-nav__item';
                const a = document.createElement('a');
                if (item.useLayout) { a.href = `${layoutPrefix}${item.pageKey}`; }
                else { a.href = `${hrefPrefix}${item.href}`; }
                a.innerHTML = `${item.icon ? item.icon.replace('cv-nav__icon', 'cv-bottom-nav__icon') : ''}<span class="cv-bottom-nav__label">${item.label}</span>`;
                a.className = 'cv-bottom-nav__link';
                if (currentPage === item.pageKey) { a.classList.add('cv-bottom-nav__link--active'); a.setAttribute('aria-current', 'page'); }
                li.appendChild(a);
                bottomUl.appendChild(li);
            });
            bottomNav.appendChild(bottomUl);
            document.body.appendChild(bottomNav);
            document.body.classList.add('has-bottom-nav');
        }
        // Também garantir que o #mainNav (desktop) seja exibido/oculto corretamente
        const mainDesktopNav = document.getElementById('mainNav');
        if (mainDesktopNav) {
            mainDesktopNav.style.display = window.innerWidth < 768 ? 'none' : 'flex';
        }
        const hamburger = document.getElementById('hamburgerButton');
        if(hamburger) {
            hamburger.style.display = window.innerWidth < 768 ? 'flex' : 'none';
        }
    }, 250));
});
