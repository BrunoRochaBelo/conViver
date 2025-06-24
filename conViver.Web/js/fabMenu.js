export function initFabMenu(getItems) {
    const fab = document.createElement('button');
    fab.className = 'fab fab-menu-button';
    fab.textContent = '+';
    document.body.appendChild(fab);

    const menu = document.createElement('div');
    menu.className = 'fab-menu';
    document.body.appendChild(menu);

    function renderMenu() {
        const items = (typeof getItems === 'function') ? getItems() : [];
        menu.innerHTML = '';
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'fab-menu__item';
            btn.textContent = item.label;
            btn.addEventListener('click', () => {
                menu.style.display = 'none';
                if (item.onClick) item.onClick();
                if (item.href) window.location.href = item.href;
            });
            menu.appendChild(btn);
        });
    }

    fab.addEventListener('click', () => {
        if (menu.style.display === 'flex') {
            menu.style.display = 'none';
        } else {
            renderMenu();
            menu.style.display = 'flex';
        }
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== fab) {
            menu.style.display = 'none';
        }
    });
}
