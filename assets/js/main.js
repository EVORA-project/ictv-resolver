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
  initBrightMode();
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
 * Bright mode for publication screenshots
 * ------------------------------- */
function initBrightMode() {
  const toggle = document.querySelector("#brightModeToggle");
  if (!toggle) return;

  const storageKey = "evora-ictv-bright-mode";
  const resolver = document.querySelector("#ictv-resolver");
  if (!resolver) return;

  function getBrightModeIcon(isBright) {
    if (isBright) {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24" aria-hidden="true">
          <path d="M12 2C9.76 2 7.78 3.05 6.5 4.68l9.81 9.82C17.94 13.21 19 11.24 19 9a7 7 0 0 0-7-7M3.28 4 2 5.27 5.04 8.3C5 8.53 5 8.76 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h5.73l4 4L20 20.72zM9 20v1a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1z"></path>
        </svg>
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24" aria-hidden="true">
        <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7M9 21a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1H9z"></path>
      </svg>
    `;
  }

  function getInitialState() {
    const requestedTheme = new URLSearchParams(window.location.search).get("theme");
    if (requestedTheme === "bright") return true;
    if (requestedTheme === "dark") return false;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "on") return true;
      if (saved === "off") return false;
    } catch (err) {
      console.warn("Bright mode preference unavailable", err);
    }
    return false;
  }

  function applyBrightMode(isBright) {
    resolver.classList.toggle("evora-bright-mode", isBright);
    toggle.innerHTML = getBrightModeIcon(isBright);
    toggle.setAttribute("aria-pressed", String(isBright));
    toggle.setAttribute(
      "aria-label",
      isBright ? "Switch to dark mode" : "Switch to bright mode"
    );
    toggle.setAttribute(
      "title",
      isBright ? "Switch to dark mode" : "Switch to bright mode"
    );
  }

  let isBright = getInitialState();
  applyBrightMode(isBright);

  toggle.addEventListener("click", () => {
    isBright = !isBright;
    applyBrightMode(isBright);
    try {
      localStorage.setItem(storageKey, isBright ? "on" : "off");
    } catch (err) {
      console.warn("Bright mode preference could not be saved", err);
    }
  });
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
