// Wide screen with a mouse: details show on the right while hovering an item, hide on leave.
// Phone / tablet / narrow window: tap an item to drop its details down under it.
// (960px matches the layout breakpoint in style.css)
const canHover = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 960px)");
const narrow = window.matchMedia("(max-width: 959px)");

document.querySelectorAll("[data-select]").forEach((list) => {
  const items = [...list.querySelectorAll(".item")];

  const setActive = (target) => {
    items.forEach((item) => {
      const active = item === target;
      item.classList.toggle("is-active", active);
      item.querySelector(".item-btn").setAttribute("aria-expanded", String(active));
    });
  };

  items.forEach((item) => {
    const btn = item.querySelector(".item-btn");

    btn.addEventListener("mouseenter", () => { if (canHover.matches) setActive(item); });
    btn.addEventListener("mouseleave", () => { if (canHover.matches) setActive(null); });

    // Keyboard users get the same as hover
    btn.addEventListener("focus", () => { if (canHover.matches) setActive(item); });
    btn.addEventListener("blur", () => { if (canHover.matches) setActive(null); });

    btn.addEventListener("click", () => {
      // Mouse: a click just keeps the hovered item open.
      // Touch: tap opens the item, tapping it again closes it.
      if (canHover.matches) setActive(item);
      // Team on phones/tablets: the large-photo code highlights the name while the photo is open
      else if (list.classList.contains("members")) return;
      else setActive(item.classList.contains("is-active") ? null : item);
    });
  });
});

// Team: click / tap a photo or a name → large photo between the header and an equal bottom gap.
const lightbox = document.querySelector(".lightbox");
if (lightbox) {
  const big = lightbox.querySelector("img");
  const closeBtn = lightbox.querySelector(".lightbox-close"); // the cross in the photo's corner
  let lastTrigger = null;

  const BIG_SIZES = "min(calc((100vh - 124px) * 0.8), 100vw)";

  // Get the large version ready (downloaded + decoded) as soon as the pointer comes near,
  // so opening is instant and the fade doesn't stutter.
  const warmed = new Set();
  const warm = (photo) => {
    if (warmed.has(photo)) return;
    warmed.add(photo);
    const pre = new Image();
    pre.sizes = BIG_SIZES;
    pre.srcset = photo.srcset;
    if (pre.decode) pre.decode().catch(() => {});
  };

  const open = (photo, trigger) => {
    big.sizes = BIG_SIZES;
    big.srcset = photo.srcset;
    big.src = photo.currentSrc || photo.src;
    big.alt = photo.alt;
    lastTrigger = trigger;
    // The tapped/clicked person's name turns black + underlined; it goes back to grey on close
    const item = photo.closest(".item");
    item.classList.add("is-active");
    item.querySelector(".item-btn").setAttribute("aria-expanded", "true");
    lightbox.hidden = false;
    if (trigger) closeBtn.focus({ preventScroll: true }); // opened with the keyboard
    document.documentElement.style.overflow = "hidden"; // no page scroll behind it
    getComputedStyle(lightbox).opacity; // start from the hidden state, so it fades in
    lightbox.classList.add("is-open");
  };
  const close = () => {
    if (lightbox.hidden) return;
    lightbox.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    // Nothing stays highlighted after closing (a mouse hover will highlight again by itself)
    document.querySelectorAll(".members .item.is-active").forEach((i) => {
      i.classList.remove("is-active");
      i.querySelector(".item-btn").setAttribute("aria-expanded", "false");
    });
    setTimeout(() => { if (!lightbox.classList.contains("is-open")) lightbox.hidden = true; }, 250);
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  };
  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); close(); });

  document.querySelectorAll(".members .item").forEach((item) => {
    const photo = item.querySelector(".member-photo");
    const btn = item.querySelector(".item-btn");
    // Return keyboard focus to the name only when it was opened with the keyboard
    // (with a mouse that would re-show the hover photo on the right).
    [btn, photo].forEach((el) => {
      el.addEventListener("pointerenter", () => warm(photo));
      el.addEventListener("pointerdown", () => warm(photo));
    });
    btn.addEventListener("click", (e) => open(photo, e.detail === 0 ? btn : null));
    photo.addEventListener("click", () => open(photo, null)); // photos are clickable on phones/tablets
  });
  lightbox.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("pageshow", (e) => { if (e.persisted) close(); });
}

// Phones / tablets: keep the (closed) list centered on screen, but pinned,
// so opening an item doesn't move the items above it.
const main = document.querySelector(".main");
const content = main && main.querySelector(".content");

function collapsedHeight() {
  let h = content.getBoundingClientRect().height;
  content.querySelectorAll(".item.is-active .detail").forEach((d) => {
    h -= d.getBoundingClientRect().height + parseFloat(getComputedStyle(d).marginTop);
  });
  return h;
}

function placeContent() {
  if (!content) return;
  if (!narrow.matches) {
    main.classList.remove("is-pinned");
    main.style.paddingTop = "";
    return;
  }
  const minTop = window.innerHeight < 520 ? 64 : 100; // phones turned sideways have little height
  const top = Math.max(minTop, (window.innerHeight - collapsedHeight()) / 2);
  main.style.paddingTop = top + "px";
  main.classList.add("is-pinned");
}

placeContent();
if (document.fonts) document.fonts.ready.then(placeContent);
window.addEventListener("resize", placeContent);

// ---------- Page transitions ----------
const body = document.body;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const RETURN_FLAG = "mtc-return-home";

// Normal left click only — Ctrl/Cmd/Shift/middle click still open a new tab as usual
const isPlainClick = (e) => !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);

if (body.classList.contains("home")) {
  const menuLink = document.querySelector(".home .menu-link");

  // Home → Menu: the white curtain slides in from the right (MENU side), then the menu opens.
  menuLink.addEventListener("click", (e) => {
    if (!isPlainClick(e) || reduceMotion.matches || body.classList.contains("is-leaving")) return;
    e.preventDefault();
    menuLink.classList.add("is-pressed");
    body.classList.add("is-leaving");
    setTimeout(() => { window.location.href = menuLink.href; }, 500);
  });

  // Menu → Home: the page starts covered (see the inline script in index.html),
  // then the curtain slides back to the right and uncovers the video.
  const revealFromCurtain = () => {
    body.classList.add("is-returning");
    // Let the browser actually paint the covered screen first, otherwise it skips
    // straight to the end and nothing moves. Two animation frames = one painted frame;
    // the timeout is a fallback for background tabs, where frames are paused.
    let started = false;
    const slideDown = () => {
      if (started) return;
      started = true;
      body.classList.remove("is-leaving");
      setTimeout(() => body.classList.remove("is-returning"), 750);
    };
    requestAnimationFrame(() => requestAnimationFrame(slideDown));
    setTimeout(slideDown, 150);
  };
  if (body.classList.contains("is-leaving")) revealFromCurtain();

  // Logo on the home page: we're already home — no animation and no reload.
  document.querySelector(".home .logo").addEventListener("click", (e) => {
    if (isPlainClick(e)) e.preventDefault();
  });

  // Browser Back button (page restored from memory, still covered): same reveal
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    try { sessionStorage.setItem("mtc-last-page", "/"); } catch (err) {}
    if (body.classList.contains("is-leaving")) revealFromCurtain();
    const v = document.querySelector(".hero");
    if (v && v.paused) v.play().catch(() => {});
  });
} else {
  // Inner pages: content fades out quickly before going to another page of the site.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a || !isPlainClick(e) || reduceMotion.matches) return;
    if (a.origin !== location.origin || a.target === "_blank" || a.hasAttribute("download")) return;
    if (a.pathname === location.pathname) return; // same page / "#" links
    e.preventDefault();
    if (a.pathname === "/") {
      // Going home → tell the home page to play the "curtain down" reveal
      try { sessionStorage.setItem(RETURN_FLAG, "1"); } catch (err) {}
    }
    a.classList.add("is-pressed"); // keep the pressed look (black / underline) until the next page
    body.classList.add("is-exiting");
    setTimeout(() => { window.location.href = a.href; }, 160);
  });

  // Back button returning to a page that was faded out: show it again
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) body.classList.remove("is-exiting");
    try { sessionStorage.setItem("mtc-last-page", location.pathname); } catch (err) {}
  });
  // Remember which page we were on, so Home knows to play the reveal on "Back"
  try { sessionStorage.setItem("mtc-last-page", location.pathname); } catch (err) {}
}

// Coming back with the Back button: nothing should still look pressed
window.addEventListener("pageshow", (e) => {
  if (e.persisted) document.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed"));
});

// iPhone/iPad Safari only shows the "pressed" (:active) look when the page listens to touches
document.addEventListener("touchstart", () => {}, { passive: true });

// Keep the copyright year current.
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = "© " + new Date().getFullYear();
});
