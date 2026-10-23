(() => {
  "use strict";
  const KEY = "ichika-study-v1";
  const CIRC = 2 * Math.PI * 98;
  const $ = (s) => document.querySelector(s);
  let state = { tasks: [], focus: {}, theme: "light" };
  let filter = "all", toastTimer, interval = null, duration = 25, remaining = 1500, running = false, endsAt = null;

  const dayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved) state = {
      tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
      focus: saved.focus && typeof saved.focus === "object" ? saved.focus : {},
      theme: saved.theme === "dark" ? "dark" : "light"
    };
  } catch (_) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { toast("Não foi possível salvar neste dispositivo."); } }
  function toast(message) {
    const el = $("#toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
  }
  function setTheme(theme) {
    state.theme = theme; document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#111115" : "#f5f5f7";
    $("#theme").textContent = theme === "dark" ? "☾" : "☼"; save();
  }
  function stats() {
    const todays = state.tasks.filter(t => t.createdDay === dayKey());
    const done = todays.filter(t => t.done).length;
    const pct = todays.length ? Math.round(done / todays.length * 100) : 0;
    $("#done").textContent = done;
    $("#total").textContent = `de ${todays.length} ${todays.length === 1 ? "tarefa" : "tarefas"}`;
    $("#minutes").textContent = Number(state.focus[dayKey()] || 0);
    $("#percent").textContent = `${pct}%`; $("#bar").style.width = `${pct}%`;
    const pending = state.tasks.filter(t => !t.done).length;
    $("#pending").textContent = `${pending} ${pending === 1 ? "pendente" : "pendentes"}`;
  }
  function renderTasks() {
    const list = $("#tasks"); list.replaceChildren();
    const filtered = state.tasks.filter(t => filter === "all" || (filter === "open" ? !t.done : t.done));
    filtered.forEach(task => {
      const li = document.createElement("li"); li.className = `task${task.done ? " done" : ""}`;
      const check = document.createElement("button"); check.className = "check"; check.type = "button";
      check.textContent = task.done ? "✓" : ""; check.setAttribute("aria-label", task.done ? "Marcar pendente" : "Concluir tarefa");
      check.addEventListener("click", () => { task.done = !task.done; save(); render(); toast(task.done ? "Tarefa concluída. Boa!" : "Tarefa voltou para pendentes."); });
      const name = document.createElement("span"); name.className = "task-name"; name.textContent = task.text;
      const del = document.createElement("button"); del.className = "delete"; del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label", "Excluir tarefa");
      del.addEventListener("click", () => { state.tasks = state.tasks.filter(t => t.id !== task.id); save(); render(); toast("Tarefa removida."); });
      li.append(check, name, del); list.append(li);
    });
    $("#empty").hidden = filtered.length > 0;
    if (!filtered.length && state.tasks.length && filter !== "all") {
      $("#empty b").textContent = filter === "open" ? "Tudo em dia!" : "Ainda sem tarefas concluídas";
      $("#empty small").textContent = filter === "open" ? "Você não tem tarefas pendentes." : "Conclua uma tarefa e ela aparecerá aqui.";
    } else {
      $("#empty b").textContent = "Seu espaço está livre";
      $("#empty small").textContent = "Adicione uma tarefa pequena para começar.";
    }
  }
  function render() { renderTasks(); stats(); }
  $("#task-form").addEventListener("submit", e => {
    e.preventDefault(); const input = $("#task"), text = input.value.trim();
    if (!text) return;
    state.tasks.unshift({ id: `${Date.now()}-${Math.random()}`, text, done: false, createdDay: dayKey() });
    input.value = ""; filter = "all";
    document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b.dataset.filter === filter));
    save(); render(); input.focus(); toast("Tarefa adicionada.");
  });
  document.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
    filter = b.dataset.filter; document.querySelectorAll(".filter").forEach(x => x.classList.toggle("active", x === b)); renderTasks();
  }));
  $("#theme").addEventListener("click", () => { setTheme(state.theme === "dark" ? "light" : "dark"); toast("Tema alterado."); });

  const fmt = n => `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
  function timerUI() {
    $("#clock").textContent = fmt(remaining);
    $("#mode").textContent = duration === 5 ? "PAUSA CURTA" : duration === 15 ? "SESSÃO DE 15 MIN" : "HORA DE FOCAR";
    $("#caption").textContent = running ? "Você está no caminho. Continue." : "Pequenos passos, grandes mudanças.";
    $("#start").textContent = running ? "Pausar foco" : remaining === 0 ? "Começar de novo" : "Começar foco";
    $("#ring").style.strokeDasharray = CIRC;
    $("#ring").style.strokeDashoffset = CIRC * (1 - remaining / (duration * 60));
  }
  function stopInterval() { if (interval !== null) clearInterval(interval); interval = null; }
  function complete() {
    stopInterval(); running = false; endsAt = null;
    if (duration === 25) { state.focus[dayKey()] = Number(state.focus[dayKey()] || 0) + 25; save(); stats(); }
    remaining = 0; timerUI(); toast(duration === 5 ? "Pausa finalizada. Bom retorno!" : "Sessão finalizada. Muito bem!");
    if (navigator.vibrate) navigator.vibrate([100,70,100]);
  }
  function tick() {
    if (!running || endsAt === null) return;
    remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    if (remaining <= 0) complete(); else timerUI();
  }
  function start() { running = true; endsAt = Date.now() + remaining * 1000; stopInterval(); interval = setInterval(tick, 250); timerUI(); }
  $("#start").addEventListener("click", () => {
    if (running) { tick(); if (!running) return; running = false; endsAt = null; stopInterval(); timerUI(); toast("Cronômetro pausado."); }
    else { if (remaining <= 0) remaining = duration * 60; start(); }
  });
  $("#reset").addEventListener("click", () => { stopInterval(); running = false; endsAt = null; remaining = duration * 60; timerUI(); toast("Cronômetro reiniciado."); });
  document.querySelectorAll(".preset").forEach(b => b.addEventListener("click", () => {
    stopInterval(); running = false; endsAt = null; duration = Number(b.dataset.min); remaining = duration * 60;
    document.querySelectorAll(".preset").forEach(x => x.classList.toggle("active", x === b)); timerUI();
  }));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && running) tick(); });
  $("#today").textContent = new Intl.DateTimeFormat("pt-BR", { weekday:"long", day:"numeric", month:"long" }).format(new Date()).toLocaleUpperCase("pt-BR");
  setTheme(state.theme); timerUI(); render();
})();
