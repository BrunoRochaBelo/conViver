export function buildNavigation() {
    const navContainer = document.getElementById('mainNav');
    if (!navContainer) return;

    const isInPagesDir = window.location.pathname.includes('/pages/');
    const hrefPrefix = isInPagesDir ? '' : 'pages/';
    const layoutPrefix = isInPagesDir ? '../layout.html?page=' : 'layout.html?page=';

    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

    const items = [
        { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
        { key: 'financeiro', label: 'Financeiro', href: 'financeiro.html' },
        { key: 'reservas', label: 'Reservas', href: 'reservas.html', useLayout: true },
        { key: 'portaria', label: 'Portaria', href: 'portaria.html', useLayout: true },
        { key: 'comunicacao', label: 'Comunicação', href: 'comunicacao.html', useLayout: true },
        // { key: 'ocorrencias', label: 'Ocorrências', href: 'ocorrencias.html' }, // Removido
        { key: 'biblioteca', label: 'Biblioteca', href: 'biblioteca.html' },
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
