const header = document.querySelector('.cv-header');
const tabs = document.querySelector('.cv-tabs');

if (header && tabs) {
  let lastScrollY = window.scrollY;
  let isHeaderHidden = false;
  const threshold = 10;

  function update() {
    const current = window.scrollY;
    const delta = current - lastScrollY;
    if (Math.abs(delta) <= threshold) return;

    if (delta > 0 && current > header.offsetHeight) {
      if (!isHeaderHidden) {
        header.classList.add('cv-header--hidden');
        tabs.classList.add('cv-tabs--fixed');
        isHeaderHidden = true;
      }
    } else if (delta < 0 || current <= 0) {
      if (isHeaderHidden) {
        header.classList.remove('cv-header--hidden');
        tabs.classList.remove('cv-tabs--fixed');
        isHeaderHidden = false;
      }
    }
    lastScrollY = current;
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
      ticking = true;
    }
  });
}
