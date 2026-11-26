(() => {
  "use strict";

  const { courses, teachers, lessons, days, daysFull, faq, contact, rates } = window.SCHOOL;
  // ---- currency ----
  const nf = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  let cur = "TJS";
  try { cur = localStorage.getItem("orbita-cur") || "TJS"; } catch (e) {}
  const money = (tjs) => {
    if (cur === "TJS") return `${nf(tjs)} сомони`;
    const usd = tjs / rates.TJS_per_USD;
    if (cur === "USD") return `≈ $${Math.round(usd / 5) * 5}`;
    return `≈ ${nf(Math.round((usd * rates.UZS_per_USD) / 1000) * 1000)} сум`;
  };
  const applyCur = () => {
    document.querySelectorAll(".pr[data-tjs]").forEach((el) => (el.textContent = money(+el.dataset.tjs)));
    document.querySelectorAll("[data-cur]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === cur)));
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cur]");
    if (!b) return;
    cur = b.dataset.cur;
    try { localStorage.setItem("orbita-cur", cur); } catch (er) {}
    applyCur();
  });
  const wa = (text) => `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}`;
  const $ = (s, el = document) => el.querySelector(s);
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]));
  const teacherById = Object.fromEntries(teachers.map((t) => [t.id, t]));
  const svg = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const initials = (name) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("");
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Contacts from settings
  $("#cAddress").textContent = contact.address;
  $("#cHours").textContent = contact.hours;
  $("#cPhone").textContent = contact.phone;
  $("#cPhone").href = "tel:" + contact.phoneHref;
  $("#cWa").href = wa("Здравствуйте! Хочу узнать о занятиях в «Орбите».");

  // Header
  const header = $("#header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = $("#burger");
  const nav = $("#nav");
  burger.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      nav.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  const navLinks = [...nav.querySelectorAll("a")];
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  ["courses", "schedule", "teachers", "faq", "contacts"].forEach((id) =>
    spy.observe(document.getElementById(id)),
  );

  // Today widget
  const todayIdx = Math.min(5, (new Date().getDay() + 6) % 7);
  const todayLessons = lessons.filter((l) => l.day === todayIdx).slice(0, 4);
  $("#todayList").innerHTML = todayLessons
    .map((l, i) => {
      const c = courseById[l.course];
      return `<div class="hc-item" style="animation-delay:${0.5 + i * 0.12}s">
        <span class="hc-time">${l.start}</span>
        <span class="hc-ico" style="background:${c.color}">${svg(c.icon)}</span>
        <div><b>${c.name}</b><small>${teacherById[l.teacher].name} · ${l.group}</small></div>
      </div>`;
    })
    .join("");
  $("#today .hc-head span").textContent =
    (todayIdx === new Date().getDay() - 1 ? "Сегодня" : daysFull[todayIdx]) + " в Орбите";


  // Courses
  $("#courseGrid").innerHTML = courses
    .map(
      (c, i) => `<article class="course reveal" style="--c:${c.color};--i:${i}">
        <span class="c-ico">${svg(c.icon)}</span>
        <h3>${c.name}</h3>
        <p>${c.text}</p>
        <div class="c-meta"><span>${c.age}</span><span>${c.length}</span></div>
        <div class="c-foot"><span><span class="pr" data-tjs="${c.price}">${money(c.price)}</span> / мес</span><button class="c-link" data-course="${c.id}">Расписание →</button></div>
      </article>`,
    )
    .join("");
  applyCur();
  $("#courseGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-course]");
    if (!b) return;
    setFilter(b.dataset.course);
    document.getElementById("schedule").scrollIntoView({ behavior: "smooth" });
  });

  // Schedule
  let day = todayIdx;
  let filter = "all";
  const daysEl = $("#days");
  daysEl.innerHTML =
    '<span class="day-ind" id="dayInd"></span>' +
    days
      .map(
        (d, i) => `<button class="day" role="tab" data-day="${i}" aria-label="${daysFull[i]}">${d}</button>`,
      )
      .join("");
  const dayInd = $("#dayInd");

  const filtersEl = $("#filters");
  filtersEl.innerHTML =
    `<button class="chip on" data-f="all">Все</button>` +
    courses
      .map((c) => `<button class="chip" data-f="${c.id}" style="--c:${c.color}"><i></i>${c.name}</button>`)
      .join("");

  function moveIndicator() {
    const b = daysEl.querySelector(`[data-day="${day}"]`);
    dayInd.style.width = b.offsetWidth + "px";
    dayInd.style.transform = `translateX(${b.offsetLeft}px)`;
  }

  function seatsLabel(n) {
    if (n === 0) return ["none", "Мест нет"];
    if (n <= 2) return ["low", n === 1 ? "Осталось 1 место" : "Осталось 2 места"];
    return ["", `Свободно мест: ${n}`];
  }

  function renderLessons() {
    daysEl.querySelectorAll(".day").forEach((b) => {
      const on = Number(b.dataset.day) === day;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    moveIndicator();
    const list = lessons
      .map((l, idx) => ({ ...l, idx }))
      .filter((l) => l.day === day && (filter === "all" || l.course === filter));
    const box = $("#lessons");
    if (!list.length) {
      box.innerHTML = `<div class="empty">В этот день нет занятий по выбранному направлению. Попробуй другой день.</div>`;
      return;
    }
    box.innerHTML = list
      .map((l, i) => {
        const c = courseById[l.course];
        const t = teacherById[l.teacher];
        const [cls, text] = seatsLabel(l.seats);
        return `<article class="lesson" style="--c:${c.color};animation-delay:${i * 60}ms">
          <div class="l-time">${l.start}<small>до ${l.end}</small></div>
          <div class="l-body">
            <div class="l-title"><span class="l-ico">${svg(c.icon)}</span>${c.name}</div>
            <div class="l-meta"><button class="l-teacher" data-teacher="${t.id}">${t.name}</button> · ${l.group} · ${l.room}</div>
            <div class="l-foot">
              <span class="seats ${cls}">${text}</span>
              <button class="btn btn-sm" data-book="${l.idx}" ${l.seats === 0 ? "disabled" : ""}>${l.seats === 0 ? "Мест нет" : "Записаться"}</button>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  function setFilter(f) {
    filter = f;
    filtersEl.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.dataset.f === f));
    if (f !== "all" && !lessons.some((l) => l.day === day && l.course === f)) {
      const first = lessons.find((l) => l.course === f);
      if (first) day = first.day;
    }
    renderLessons();
  }

  daysEl.addEventListener("click", (e) => {
    const b = e.target.closest(".day");
    if (!b) return;
    day = Number(b.dataset.day);
    renderLessons();
  });
  filtersEl.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (b) setFilter(b.dataset.f);
  });
  $("#lessons").addEventListener("click", (e) => {
    const t = e.target.closest("[data-teacher]");
    if (t) return openTeacher(t.dataset.teacher);
    const b = e.target.closest("[data-book]");
    if (b && !b.disabled) openBooking(Number(b.dataset.book));
  });
  window.addEventListener("resize", moveIndicator);
  renderLessons();

  // Teachers
  $("#teacherGrid").innerHTML = teachers
    .map((t, i) => {
      const c = courseById[t.course];
      return `<button class="teacher reveal" data-teacher="${t.id}" style="--c:${c.color};--i:${i}">
        <span class="avatar">${initials(t.name)}</span>
        <span class="t-years">${t.years} лет опыта</span>
        <h3>${t.name}</h3>
        <div class="t-role">${t.role}</div>
        <p>${t.short}</p>
      </button>`;
    })
    .join("");
  $("#teacherGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-teacher]");
    if (b) openTeacher(b.dataset.teacher);
  });

  // FAQ
  $("#faqList").innerHTML = faq
    .map(
      ([q, a], i) => `<div class="q reveal">
        <button aria-expanded="false" aria-controls="qa${i}">${q}<i></i></button>
        <div class="q-a" id="qa${i}"><div><p>${a}</p></div></div>
      </div>`,
    )
    .join("");
  $("#faqList").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const q = b.parentElement;
    const open = !q.classList.contains("open");
    q.classList.toggle("open", open);
    b.setAttribute("aria-expanded", String(open));
  });

  // Modal
  const modal = $("#modal");
  const body = $("#modalBody");
  let lastFocus = null;

  function openModal(html) {
    lastFocus = document.activeElement;
    body.innerHTML = html;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    setTimeout(() => (body.querySelector("input") || $(".modal-x")).focus(), 60);
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lock");
    if (lastFocus) lastFocus.focus();
  }

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
    const b = e.target.closest("[data-book]");
    if (b) openBooking(Number(b.dataset.book));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });

  function openTeacher(id) {
    const t = teacherById[id];
    const c = courseById[t.course];
    const slots = lessons
      .map((l, idx) => ({ ...l, idx }))
      .filter((l) => l.teacher === id)
      .map(
        (l) => `<div class="slot"><span>${daysFull[l.day]}, ${l.start}–${l.end} · ${l.group}</span>
          ${l.seats ? `<button class="c-link" style="--c:${c.color}" data-book="${l.idx}">Записаться</button>` : "<span>мест нет</span>"}</div>`,
      )
      .join("");
    openModal(`<div style="--c:${c.color}">
      <div class="m-head"><span class="avatar">${initials(t.name)}</span>
        <div><h3 id="modalTitle">${t.name}</h3><div class="m-sub">${t.role} · ${t.years} лет опыта</div></div></div>
      <p class="m-text">${t.bio}</p>
      <div class="m-tags">${t.tags.map((x) => `<span>${x}</span>`).join("")}</div>
      <div class="m-slots"><h4>Занятия в расписании</h4>${slots}</div>
    </div>`);
  }

  function openBooking(idx) {
    const l = lessons[idx];
    const c = courseById[l.course];
    const t = teacherById[l.teacher];
    openModal(`<div style="--c:${c.color}">
      <h3 id="modalTitle">Запись на пробное занятие</h3>
      <div class="summary"><b>${c.name} · ${l.group}</b>${daysFull[l.day]}, ${l.start}–${l.end} · ${t.name} · ${l.room}</div>
      <form class="form" id="bookForm" novalidate>
        <div class="field"><label for="fName">Имя ученика</label><input id="fName" autocomplete="name" maxlength="40"><small></small></div>
        <div class="field"><label for="fPhone">Телефон родителя</label><input id="fPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+992"><small></small></div>
        <button class="btn" type="submit">Продолжить в WhatsApp</button><p class="form-note">Откроется WhatsApp с готовым сообщением — останется нажать «Отправить».</p>
      </form>
    </div>`);
    $("#bookForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#fName");
      const phone = $("#fPhone");
      const okName = name.value.trim().length >= 2;
      const okPhone = phone.value.replace(/\D/g, "").length >= 9;
      [
        [name, okName, "Введите имя"],
        [phone, okPhone, "Проверьте номер"],
      ].forEach(([el, ok, msg]) => {
        const f = el.parentElement;
        f.classList.remove("bad");
        void f.offsetWidth;
        f.classList.toggle("bad", !ok);
        f.querySelector("small").textContent = ok ? "" : msg;
      });
      if (!okName || !okPhone) return;
      const msg = [
        "Здравствуйте! Хочу записаться на пробное занятие в «Орбите».",
        `Направление: ${c.name} (${l.group})`,
        `Когда: ${daysFull[l.day]}, ${l.start}–${l.end}`,
        `Преподаватель: ${t.name}`,
        `Ученик: ${name.value.trim()}`,
        `Телефон: ${phone.value.trim()}`,
      ].join("\n");
      const url = wa(msg);
      let w = null;
      try { w = window.open(url, "_blank", "noopener"); } catch (er) {}
      if (!w) location.href = url;
      body.innerHTML = `<div class="done">
        <div class="done-ico">${svg('<path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" stroke-width="3"/>')}</div>
        <h3>Почти готово</h3>
        <p>Мы открыли WhatsApp с готовым сообщением — нажмите «Отправить». Администратор подтвердит время.</p>
        <a class="btn" href="${url}" target="_blank" rel="noopener">Открыть WhatsApp ещё раз</a>
      </div>`;
    });
  }

  // Toast
  let toastTimer;
  function toast(text) {
    const el = $("#toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // Reveal and counters
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const t0 = performance.now() + 400;
    const step = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 1200));
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
})();
