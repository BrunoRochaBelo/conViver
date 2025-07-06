import { initHeaderTabsScroll } from './headerTabsScroll.js';

export async function loadPage() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (!page) return;
    try {
        const resp = await fetch(`pages/${page}.html`);
        const html = await resp.text();
        const container = document.getElementById('pageMain');
        if (container) {
            container.innerHTML = html;
        }
        try {
            const module = await import(`./${page}.js`);
            if (typeof module.initialize === 'function') {
                module.initialize();
            }
        } catch (err) {
            console.error('Erro ao carregar script da página', err);
        }
        initHeaderTabsScroll();
    } catch (err) {
        console.error('Erro ao carregar conteúdo da página', err);
    }
}

document.addEventListener('DOMContentLoaded', loadPage);
