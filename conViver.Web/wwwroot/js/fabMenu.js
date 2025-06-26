export function initFabMenu(actions = []) {
    if (!actions || actions.length === 0) return;

    const container = document.createElement('div');
    container.className = 'fab-menu';

    const mainBtn = document.createElement('button');
    mainBtn.className = 'fab fab-main';
    mainBtn.type = 'button';
    mainBtn.textContent = '+';
    mainBtn.style.display = 'block';
    container.appendChild(mainBtn);

    const menu = document.createElement('div');
    menu.className = 'fab-menu-options';
    actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'cv-button';
        btn.textContent = act.label;
        if (typeof act.onClick === 'function') {
            btn.addEventListener('click', () => {
                act.onClick();
                container.classList.remove('fab-menu--open');
            });
        } else if (act.href) {
            btn.addEventListener('click', () => { window.location.href = act.href; });
        }
        menu.appendChild(btn);
    });
    container.appendChild(menu);

    mainBtn.addEventListener('click', () => {
        container.classList.toggle('fab-menu--open');
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            container.classList.remove('fab-menu--open');
        }
    });

    document.body.appendChild(container);
}
