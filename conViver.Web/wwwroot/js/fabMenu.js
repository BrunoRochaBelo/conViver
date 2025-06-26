let fabMenuContainer = null;

export function initFabMenu(actions = []) {
    if (!fabMenuContainer) {
        fabMenuContainer = document.createElement('div');
        fabMenuContainer.className = 'fab-menu';

        const mainBtn = document.createElement('button');
        mainBtn.className = 'fab fab-main';
        mainBtn.type = 'button';
        mainBtn.textContent = '+';
        fabMenuContainer.appendChild(mainBtn);

        const menu = document.createElement('div');
        menu.className = 'fab-menu-options';
        fabMenuContainer.appendChild(menu);

        mainBtn.addEventListener('click', () => {
            fabMenuContainer.classList.toggle('fab-menu--open');
        });

        document.addEventListener('click', (e) => {
            if (!fabMenuContainer.contains(e.target)) {
                fabMenuContainer.classList.remove('fab-menu--open');
            }
        });

        document.body.appendChild(fabMenuContainer);
    }

    setFabMenuActions(actions);
    return fabMenuContainer;
}

export function setFabMenuActions(actions = []) {
    if (!fabMenuContainer) return;
    const menu = fabMenuContainer.querySelector('.fab-menu-options');
    if (!menu) return;
    menu.innerHTML = '';
    actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'cv-button';
        btn.textContent = act.label;
        if (typeof act.onClick === 'function') {
            btn.addEventListener('click', () => {
                act.onClick();
                fabMenuContainer.classList.remove('fab-menu--open');
            });
        } else if (act.href) {
            btn.addEventListener('click', () => { window.location.href = act.href; });
        }
        menu.appendChild(btn);
    });
}
