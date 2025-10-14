/* -------------------------------
 * Load partials then init scripts
 * ------------------------------- */
async function loadPartial(id, file) {
  try {
    const response = await fetch(file, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Failed to fetch ${file}`);
    const html = await response.text();
    document.getElementById(id).innerHTML = html;
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadPartial("menu-placeholder", "assets/parts/menu.html"),
    loadPartial("footer-placeholder", "assets/parts/footer.html"),
    loadPartial("hero-placeholder", "assets/parts/hero.html"),
  ]);

  initMenu();
  initScroll();
  initBackToTop();
});


/* -------------------------------
 * Navbar toggle logic
 * ------------------------------- */
function initMenu() {
  const navbarToggler = document.querySelector("#navbarToggler");
  const navbarCollapse = document.querySelector("#navbarCollapse");

  if (!navbarToggler || !navbarCollapse) return;

  // Toggle navbar on click
  navbarToggler.addEventListener("click", () => {
    navbarToggler.classList.toggle("navbarTogglerActive");
    navbarCollapse.classList.toggle("hidden");
  });

  // Close on link click
  document
    .querySelectorAll("#navbarCollapse ul li:not(.submenu-item) a")
    .forEach((e) =>
      e.addEventListener("click", () => {
        navbarToggler.classList.remove("navbarTogglerActive");
        navbarCollapse.classList.add("hidden");
      })
    );
}

/* -------------------------------
 * Scroll spy (menu highlighting)
 * ------------------------------- */
function initScroll() {
  const links = document.querySelectorAll(".ud-menu-scroll");

  function onScroll() {
    const scrollPos = window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop;

    links.forEach(currLink => {
      const href = currLink.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const refElement = document.querySelector(href);
      if (!refElement) return;

      const scrollTopMinus = scrollPos + 73;
      if (
        refElement.offsetTop <= scrollTopMinus &&
        refElement.offsetTop + refElement.offsetHeight > scrollTopMinus
      ) {
        document
          .querySelectorAll(".ud-menu-scroll.active")
          .forEach(el => el.classList.remove("active"));
        currLink.classList.add("active");
      } else {
        currLink.classList.remove("active");
      }
    });
  }

  window.addEventListener("scroll", onScroll);
  onScroll();
}

/* -------------------------------
 * Back-to-top button
 * ------------------------------- */
function initBackToTop() {
  const backToTop = document.querySelector(".back-to-top");
  if (!backToTop) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTop.classList.remove("hidden");
    } else {
      backToTop.classList.add("hidden");
    }
  });

  backToTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}