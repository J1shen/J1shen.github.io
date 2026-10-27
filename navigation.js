(function () {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('.nav-links a[href^="#"]'));
  const targets = links.map((link) => document.querySelector(link.hash));
  let offset = 84;
  let scheduled = false;

  function updateCurrent() {
    scheduled = false;
    let current = -1;
    targets.forEach((target, index) => {
      if (target && target.getBoundingClientRect().top <= offset + 24) current = index;
    });
    links.forEach((link, index) => {
      if (index === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function updateOffset() {
    offset = Math.ceil(nav.getBoundingClientRect().height) + 20;
    document.documentElement.style.setProperty("--nav-offset", `${offset}px`);
    updateCurrent();
  }

  window.addEventListener("scroll", () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateCurrent);
  }, { passive: true });
  window.addEventListener("resize", updateOffset);
  if (typeof ResizeObserver === "function") new ResizeObserver(updateOffset).observe(nav);
  updateOffset();
})();
