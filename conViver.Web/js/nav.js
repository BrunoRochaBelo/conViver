export function buildNavigation() {
    const navContainer = document.getElementById('mainNav');
    if (!navContainer) return;

    const isInPagesDir = window.location.pathname.includes('/pages/');
    const rootPrefix = isInPagesDir ? '..' : '.';
    const pagesPrefix = isInPagesDir ? '' : 'pages/';

    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

    const items = [
        { key: 'dashboard', label: 'Dashboard', href: `${pagesPrefix}dashboard.html` },
        { key: 'financeiro', label: 'Financeiro', href: `${pagesPrefix}financeiro.html` },
        { key: 'reservas', label: 'Reservas', href: `${pagesPrefix}reservas.html` },
        { key: 'portaria', label: 'Portaria', href: `${pagesPrefix}portaria.html` },
        { key: 'comunicacao', label: 'Comunicação', href: `${pagesPrefix}comunicacao.html` },
    ];

    const container = document.createElement('div');
    container.className = 'cv-container';
    const ul = document.createElement('ul');
    ul.className = 'cv-nav__list';

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cv-nav__item';
        const a = document.createElement('a');
        a.href = `${rootPrefix}/${item.href}`;
        a.textContent = item.label;
        a.className = 'cv-nav__link';
        if (currentPage === item.key || (currentPage === 'index' && item.key === 'dashboard')) {
            a.classList.add('cv-nav__link--active');
        }
        li.appendChild(a);
        ul.appendChild(li);
    });

    container.appendChild(ul);
    navContainer.innerHTML = '';
    navContainer.classList.add('cv-nav');
    navContainer.appendChild(container);
}

document.addEventListener('DOMContentLoaded', buildNavigation);
