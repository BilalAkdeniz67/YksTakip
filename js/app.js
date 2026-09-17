const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const DAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const SUBJECTS = ["Matematik", "Fizik", "Kimya", "Biyoloji", "Türkçe", "Edebiyat", "Tarih", "Coğrafya"];
const DEFAULT_NO_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2364748b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-1.04-4.83-2.61.03-.99 2.02-1.89 4.83-1.89s4.79.9 4.83 1.89C15.8 18.96 14.03 20 12 20z"/></svg>`;

const defaultTimetableStrings = {
  Pazartesi: ["Matematik", "Fizik", "Kimya", "Türkçe"],
  Salı: ["Matematik", "Biyoloji", "Edebiyat", "Tarih"],
  Çarşamba: ["Fizik", "Kimya", "Türkçe", "Coğrafya"],
  Perşembe: ["Matematik", "Biyoloji", "Tarih", "Edebiyat"],
  Cuma: ["Kimya", "Fizik", "Türkçe", "Matematik"],
  Cumartesi: ["Matematik", "Fizik", "Kimya"],
  Pazar: ["Türkçe", "Tarih", "Coğrafya"],
};
const defaultTimetable = Object.fromEntries(
  Object.entries(defaultTimetableStrings).map(([day, subjects]) => [
    day,
    subjects.map((s, i) => ({ time: String(9 + i).padStart(2, "0") + ":00", subject: s }))
  ])
);


const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const todayName = DAYS[todayIndex];
const todayDateObj = new Date();
const todayDateStr = todayDateObj.getFullYear() + "-" + String(todayDateObj.getMonth() + 1).padStart(2, '0') + "-" + String(todayDateObj.getDate()).padStart(2, '0');
let currentCalMonth = todayDateObj.getMonth();
let currentCalYear = todayDateObj.getFullYear();

let profCalMonth = todayDateObj.getMonth();
let profCalYear = todayDateObj.getFullYear();
let activeProfileStudentId = null;

const defaultStore = {
  currentUser: null, // { role: 'student' | 'teacher', id: string }
  classes: ["12-A", "12-B", "12-C", "12-D"],
  timetable: defaultTimetable,
  teachers: [
    { id: "mehmet", name: "Mehmet Hoca", subject: "Matematik", password: "123" },
    { id: "ayse_hoca", name: "Ayşe Hoca", subject: "Fizik", password: "123" },
    { id: "fatma", name: "Fatma Zeynep Özkan", subject: "Biyoloji", password: "1234" }
  ],
  students: [
    { id: "105", name: "Elif Yılmaz", classId: "12-A", field: "Sayısal", avatar: "", week: [42, 55, 38, 61, 47, 28, 0] },
    { id: "106", name: "Mert Kaya", classId: "12-A", field: "Sayısal", avatar: "", week: [50, 60, 44, 70, 52, 30, 48] },
  ],
  goals: {
    "105": [{ day: todayName, subject: "Matematik", topic: "Polinomlar", count: 60 }],
    "106": [{ day: todayName, subject: "Fizik", topic: "Kuvvet", count: 50 }],
  },
  history: {},
  lessons: [
    { classId: "12-A", day: "Pazartesi", subject: "Matematik", topic: "Polinomlar" },
    { classId: "12-A", day: "Pazartesi", subject: "Fizik", topic: "Kuvvet ve Hareket" },
  ],
  selectedClass: "12-A",
  selectedDay: todayName,
};

// --- Firebase Config & Multi-backend Storage ---
// Firebase Console > Project Settings > General sekmesinden config bilgilerinizi aşağıdaki objeye ekleyebilirsiniz.
const firebaseConfig = {
  apiKey: "AIzaSyCN1bwiMvygE9uHbElZOXqVS1rnWIo3-kE",
  authDomain: "ykstakip-6b594.firebaseapp.com",
  databaseURL: "https://ykstakip-6b594-default-rtdb.firebaseio.com",
  projectId: "ykstakip-6b594",
  storageBucket: "ykstakip-6b594.firebasestorage.app",
  messagingSenderId: "428783558644",
  appId: "1:428783558644:web:caa1ca40904ea20eb223a1",
  measurementId: "G-0FZ8JHXLVB"
};

let dbRef = null;
let isFirebaseActive = false;

function initFirebase() {
  if (dbRef && isFirebaseActive) return true;
  if (typeof firebase !== "undefined" && firebaseConfig.databaseURL && !firebaseConfig.databaseURL.includes("YOUR_PROJECT_ID")) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      dbRef = firebase.database().ref("yks_store");
      isFirebaseActive = true;
      console.log("Firebase Realtime Database başarıyla bağlandı!");
      return true;
    } catch (err) {
      console.warn("Firebase başlatılırken hata oluştu:", err);
    }
  }
  return false;
}

function processStoreData(parsed) {
  if (!parsed) return;
  if (!parsed.timetable) parsed.timetable = defaultTimetable;
  else {
    Object.keys(parsed.timetable).forEach((day) => {
      parsed.timetable[day] = parsed.timetable[day]
        .map((item, i) => {
          if (typeof item === "string") return { time: String(9 + i).padStart(2, "0") + ":00", subject: item };
          return item;
        })
        .sort((a, b) => a.time.localeCompare(b.time));
    });
  }
  if (!parsed.history) parsed.history = {};
  if (!parsed.teachers) {
    parsed.teachers = defaultStore.teachers;
  } else {
    defaultStore.teachers.forEach((dt) => {
      const pt = parsed.teachers.find((t) => t.id === dt.id);
      if (!pt) parsed.teachers.push(dt);
      else if (!pt.password) pt.password = dt.password;
    });
  }
  const curr = store.currentUser;
  store = { ...structuredClone(defaultStore), ...parsed };
  if (curr) store.currentUser = curr;
}

async function loadStore() {
  initFirebase();
  if (isFirebaseActive && dbRef) {
    return new Promise((resolve) => {
      dbRef.once("value", (snapshot) => {
        const val = snapshot.val();
        if (val) {
          processStoreData(val);
        } else {
          store = structuredClone(defaultStore);
          dbRef.set(store);
        }

        // Realtime live listener across all devices
        dbRef.on("value", (snap) => {
          const liveVal = snap.val();
          if (liveVal) {
            processStoreData(liveVal);
            if (store.currentUser) renderAll();
          }
        });
        resolve();
      });
    });
  }

  // Fallback: try api.php (MySQL) or LocalStorage
  try {
    const res = await fetch("api.php?action=load");
    const data = await res.json();
    if (data && data.status !== "empty") {
      processStoreData(data);
      return;
    }
  } catch (err) {
    // PHP not running or static host (GitHub Pages)
  }

  const raw = localStorage.getItem("yks-takip-offline");
  if (raw) {
    try {
      processStoreData(JSON.parse(raw));
    } catch (e) { }
  }
}

async function saveStore() {
  localStorage.setItem("yks-takip-offline", JSON.stringify(store));
  if (isFirebaseActive && dbRef) {
    try {
      await dbRef.set(store);
    } catch (err) {
      console.error("Firebase'e kaydedilemedi:", err);
    }
  }
  try {
    await fetch("api.php?action=save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store),
    });
  } catch (err) {
    // PHP backend missing, fallback ignored silently
  }
}

const $ = (id) => document.getElementById(id);

function currentStudent() {
  if (!store.currentUser || store.currentUser.role !== 'student') return null;
  return store.students.find((s) => s.id === store.currentUser.id);
}
function currentTeacher() {
  if (!store.currentUser || store.currentUser.role !== 'teacher') return null;
  return store.teachers.find((t) => t.id === store.currentUser.id);
}

function todayGoals(studentId) {
  return (store.goals[studentId] || []).filter((g) => g.day === todayName);
}

function todayGoal(studentId) {
  const list = todayGoals(studentId);
  if (!list.length) return null;
  return {
    count: list.reduce((sum, g) => sum + g.count, 0),
    subject: list.map((g) => g.subject).join(", "),
    topic: list.map((g) => g.topic).join(", "),
  };
}

function fillSelect(select, options, selected) {
  if (!select) return;
  select.innerHTML = options.map((opt) => `<option value="${opt}" ${opt === selected ? "selected" : ""}>${opt}</option>`).join("");
}

function setRole(role, userId) {
  store.currentUser = { role, id: userId };
  saveStore();

  $("auth-screen").classList.add("hidden");
  $("mainApp").classList.remove("hidden");

  $("studentNav").classList.toggle("hidden", role !== "student");
  $("teacherNav").classList.toggle("hidden", role !== "teacher");
  $("brandRole").textContent = role === "student" ? "Öğrenci Paneli" : "Öğretmen Paneli";

  if (role === "student") {
    const s = currentStudent();
    if (s) {
      $("profileName").textContent = s.name;
      $("profileMeta").textContent = `${s.classId} · ${s.field}`;
      $("profileAvatar").src = s.avatar || DEFAULT_NO_AVATAR;
      $("profileAvatar").alt = s.name;
      $("avatarEditBtn")?.classList.remove("hidden");
    }
    showPage("home");
    document.querySelectorAll("#studentNav .nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.page === "home"));
  } else {
    const t = currentTeacher();
    if (t) {
      $("profileName").textContent = t.name;
      $("profileMeta").textContent = `${t.subject} · Öğretmen`;
      $("profileAvatar").src = DEFAULT_NO_AVATAR;
      $("profileAvatar").alt = t.name;
      $("avatarEditBtn")?.classList.add("hidden");
    }
    showPage("teacher-home");
    document.querySelectorAll("#teacherNav .nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.page === "teacher-home"));
  }
  renderAll();
}

function logout() {
  store.currentUser = null;
  saveStore();
  $("mainApp").classList.add("hidden");
  $("auth-screen").classList.remove("hidden");
  $("loginId").value = "";
  $("loginPassword").value = "";
}

function showPage(page) {
  document.querySelectorAll(".page").forEach((el) => el.classList.remove("active"));
  const target = $(`page-${page}`);
  if (target) target.classList.add("active");

  const hints = {
    home: "Bugünün özeti",
    goals: "Kendi hedeflerin",
    lessons: "Öğretmen konu kaydı",
    reports: "Raporların",
    rank: "Sıralama",
    "teacher-home": "Sınıf özeti",
    "topic-log": "İşlenen konu kaydı",
    "class-track": "Öğrenci takibi",
    "timetable": "Ders programı",
  };
  if ($("topHint")) $("topHint").textContent = hints[page] || "";
  $("sidebar").classList.remove("open");
}

function renderHome() {
  const s = currentStudent();
  if (!s) return;
  const goal = todayGoal(s.id);
  const solved = s.week[todayIndex] || 0;
  const target = goal ? goal.count : 0;
  const lesson = store.lessons.find((l) => l.classId === s.classId && l.day === todayName);

  if ($("welcomeTitle")) $("welcomeTitle").textContent = `Hoş Geldin, ${s.name}`;
  if ($("todayLesson")) $("todayLesson").innerHTML = lesson
    ? `📢 Bugünün Konu Hedefi: <span>${lesson.subject.toUpperCase()} - ${lesson.topic}</span>`
    : "📢 Bugünün Konu Hedefi: <span>Henüz konu girilmedi</span>";
  if ($("todayGoalText")) $("todayGoalText").innerHTML = goal
    ? `🎯 Kendi hedefin: <strong>${goal.count} Soru</strong> · ${goal.subject} — ${goal.topic}`
    : "🎯 Henüz bugün için hedef yazmadın.";
  if ($("solvedLabel")) $("solvedLabel").textContent = String(solved);
  if ($("goalTotal")) $("goalTotal").textContent = String(target);
  if ($("goalProgress")) $("goalProgress").style.width = target ? `${Math.min((solved / target) * 100, 100)}%` : "0%";
  if ($("solvedCount")) $("solvedCount").value = solved || "";
  renderChart(s.week);
}

function renderChart(week) {
  const chart = $("weekChart");
  if (!chart) return;
  chart.innerHTML = "";
  const max = Math.max(...week, 1);
  week.forEach((value, index) => {
    const col = document.createElement("div");
    col.className = "bar-col";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${Math.max((value / max) * 170, 8)}px`;
    bar.title = `${DAY_SHORT[index]}: ${value} soru`;
    const label = document.createElement("span");
    label.textContent = DAY_SHORT[index];
    col.append(bar, label);
    chart.append(col);
  });
}

function renderStudentGoals() {
  const s = currentStudent();
  if (!s) return;
  fillSelect($("goalDay"), DAYS, todayName);
  const list = $("studentGoalList");
  if (!list) return;
  const goals = store.goals[s.id] || [];
  if (!goals.length) {
    list.innerHTML = `<article class="list-item"><span>Henüz hedef yok</span><strong>Yukarıdan ekle</strong></article>`;
    return;
  }
  list.innerHTML = goals
    .map(
      (g, i) => `
      <article class="list-item ${g.day === todayName ? "today" : ""}">
        <span>${g.day}</span>
        <strong>${g.subject} · ${g.topic}</strong>
        <em>${g.count} soru</em>
        <button type="button" class="btn-ghost" data-del-goal="${i}">Sil</button>
      </article>`
    )
    .join("");
}

function renderLessons(gridId, classId, day) {
  const grid = $(gridId);
  if (!grid) return;
  const subjects = store.timetable[day] || [];
  if (subjects.length === 0) {
    grid.innerHTML = `<p class="lead">Bugün için programda ders bulunmuyor.</p>`;
    return;
  }
  grid.innerHTML = subjects
    .map((item) => {
      const rec = store.lessons.find((l) => l.classId === classId && l.day === day && l.subject === item.subject);
      return `
        <article class="lesson-card">
          <p class="eyebrow">${item.time} · ${item.subject}</p>
          <h3>${rec ? rec.topic : "Henüz işlenmedi"}</h3>
          <small>${classId} · ${day}${rec && rec.date ? ' · ' + rec.date.split('-').reverse().join('.') : ''}</small>
        </article>`;
    })
    .join("");
}

function renderDayTabs(containerId, selected, onClickName) {
  const c = $(containerId);
  if (!c) return;
  c.innerHTML = DAYS.map(
    (day) => `<button type="button" class="tab-btn ${day === selected ? "active" : ""}" data-${onClickName}="${day}">${day}</button>`
  ).join("");
}

function renderClassTabs(containerId, selected) {
  const c = $(containerId);
  if (!c) return;
  c.innerHTML = store.classes
    .map((cl) => `<button type="button" class="tab-btn ${cl === selected ? "active" : ""}" data-class="${cl}">${cl}</button>`)
    .join("");
}

function studentRow(student) {
  const goals = todayGoals(student.id);
  const goal = todayGoal(student.id);
  const solved = student.week[todayIndex] || 0;
  const target = goal ? goal.count : 0;
  const pct = target ? Math.min(Math.round((solved / target) * 100), 100) : 0;
  const goalText = goals.length
    ? goals.map((g) => `${g.subject}: ${g.topic} (${g.count})`).join("<br>")
    : "Hedef yok";
  return `
    <tr class="clickable-row" data-profile-id="${student.id}">
      <td>
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${student.avatar || DEFAULT_NO_AVATAR}" alt="${student.name}" class="avatar-sm" />
          <strong>${student.name}</strong>
        </div>
      </td>
      <td>${goalText}</td>
      <td>${target || "—"}</td>
      <td>${solved}</td>
      <td>
        <div class="mini-progress"><span style="width:${pct}%"></span></div>
        <small>%${pct}</small>
      </td>
    </tr>`;
}

function renderTrackTable(containerId) {
  const c = $(containerId);
  if (!c) return;
  const students = store.students.filter((s) => s.classId === store.selectedClass);
  c.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Öğrenci</th>
          <th>Günlük hedef</th>
          <th>Hedef soru</th>
          <th>Çözülen</th>
          <th>İlerleme</th>
        </tr>
      </thead>
      <tbody>${students.map(studentRow).join("")}</tbody>
    </table>`;
}

function renderTeacherHome() {
  const t = currentTeacher();
  if (!t) return;
  const students = store.students;
  const solvedToday = students.reduce((sum, s) => sum + (s.week[todayIndex] || 0), 0);
  const withGoal = students.filter((s) => todayGoal(s.id)).length;
  const done = students.filter((s) => {
    const g = todayGoal(s.id);
    return g && (s.week[todayIndex] || 0) >= g.count;
  }).length;
  if ($("teacherStats")) $("teacherStats").innerHTML = `
    <div class="stat"><b>${store.classes.length}</b><span>Sınıf</span></div>
    <div class="stat"><b>${students.length}</b><span>Öğrenci</span></div>
    <div class="stat"><b>${solvedToday}</b><span>Bugün çözülen soru</span></div>
    <div class="stat"><b>${done}/${withGoal}</b><span>Hedefini tamamlayan</span></div>
  `;
  renderClassTabs("summaryClassTabs", store.selectedClass);
  renderTrackTable("summaryTable");
}

function renderTimetable() {
  fillSelect($("ttDay"), DAYS, store.selectedDay);
  renderDayTabs("ttDayTabs", store.selectedDay, "ttday");

  const subjects = store.timetable[store.selectedDay] || [];
  const list = $("ttList");
  if (!list) return;
  if (subjects.length === 0) {
    list.innerHTML = `<article class="list-item"><span>Bu gün için ders programı boş.</span></article>`;
    return;
  }

  list.innerHTML = subjects.map((item, i) => `
    <article class="list-item">
      <div>
        <span style="color: var(--orange); font-weight: bold; margin-right: 8px;">${item.time}</span>
        <strong>${item.subject}</strong>
      </div>
      <button type="button" class="btn-ghost" data-del-tt="${i}">Kaldır</button>
    </article>
  `).join("");
}

function renderReports() {
  const s = currentStudent();
  if (!s) return;
  const total = s.week.reduce((a, b) => a + b, 0);
  const goal = todayGoal(s.id);
  const pct = goal && goal.count ? Math.min(Math.round((s.week[todayIndex] / goal.count) * 100), 100) : 0;
  if ($("reportStats")) $("reportStats").innerHTML = `
    <div class="stat"><b>${total}</b><span>Bu hafta toplam soru</span></div>
    <div class="stat"><b>%${pct}</b><span>Bugünkü hedef</span></div>
    <div class="stat"><b>${s.week.filter((n) => n > 0).length}</b><span>Çalışılan gün</span></div>
  `;
}

function renderRank() {
  const s = currentStudent();
  if (!s) return;
  const classmates = store.students
    .filter((x) => x.classId === s.classId)
    .map((x) => ({ ...x, total: x.week.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  if ($("rankList")) $("rankList").innerHTML = classmates
    .map(
      (x, i) =>
        `<li class="${x.id === s.id ? "you" : ""}"><span>${i + 1}</span> ${x.name} <b>${x.total}</b></li>`
    )
    .join("");
}

function renderTeacherRank() {
  const allStudents = store.students
    .map((x) => ({ ...x, total: x.week.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);

  if ($("teacherRankList")) $("teacherRankList").innerHTML = allStudents
    .slice(0, 20)
    .map(
      (x, i) =>
        `<li>
          <span>${i + 1}</span>
          ${x.name} <small style="margin-left:8px;color:var(--muted)">(${x.classId})</small>
          <b>${x.total} soru</b>
        </li>`
    )
    .join("");
}

function renderCalendar(forStudentId = null, isTeacherView = false) {
  let sId = forStudentId;
  if (!sId) {
    const s = currentStudent();
    if (!s) return;
    sId = s.id;
  }

  const gridId = isTeacherView ? "profCalendarGrid" : "calendarGrid";
  const myId = isTeacherView ? "profCalMonthYear" : "calMonthYear";
  const calMonth = isTeacherView ? profCalMonth : currentCalMonth;
  const calYear = isTeacherView ? profCalYear : currentCalYear;

  const grid = $(gridId);
  if (!grid) return;

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  $(myId).textContent = `${monthNames[calMonth]} ${calYear}`;

  Array.from(grid.children).forEach(child => {
    if (!child.classList.contains('cal-day-name')) child.remove();
  });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day empty";
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement("div");
    cell.className = "cal-day";
    cell.dataset.date = dateStr;
    if (isTeacherView) cell.dataset.forProf = "true";

    if (dateStr === todayDateStr) {
      cell.style.borderColor = "var(--orange)";
    }

    const num = document.createElement("div");
    num.className = "cal-num";
    num.textContent = d;
    cell.appendChild(num);

    const hist = (store.history[sId] || {})[dateStr];
    if (hist && hist.solved) {
      const badge = document.createElement("div");
      badge.className = "cal-badge";
      badge.textContent = `${hist.solved} Soru`;
      cell.appendChild(badge);
    }

    grid.appendChild(cell);
  }
}

function openStudentProfile(studentId) {
  const s = store.students.find(st => st.id === studentId);
  if (!s) return;
  activeProfileStudentId = s.id;

  if ($("profModalAvatar")) {
    $("profModalAvatar").src = s.avatar || DEFAULT_NO_AVATAR;
  }
  $("profName").textContent = s.name;
  $("profMeta").textContent = `${s.classId} • ${s.field} • ID: ${s.id}`;

  const weekTotal = s.week.reduce((a, b) => a + b, 0);
  $("profWeekTotal").textContent = weekTotal;

  let historyTotal = 0;
  if (store.history[s.id]) {
    Object.values(store.history[s.id]).forEach(h => {
      historyTotal += h.solved || 0;
    });
  }
  $("profHistoryTotal").textContent = historyTotal;

  profCalMonth = todayDateObj.getMonth();
  profCalYear = todayDateObj.getFullYear();
  $("profCalDetailCard")?.classList.add("hidden");

  renderCalendar(s.id, true);

  $("teacherStudentProfile")?.classList.remove("hidden");
}

function renderAll() {
  if (!store.currentUser) return;

  if (store.currentUser.role === 'student') {
    renderHome();
    renderStudentGoals();
    renderDayTabs("studentDayTabs", store.selectedDay, "day");
    renderLessons("studentLessonGrid", currentStudent().classId, store.selectedDay);
    renderReports();
    renderRank();
    renderCalendar();
  } else {
    renderTeacherHome();
    fillSelect($("lessonClass"), store.classes, store.selectedClass);
    fillSelect($("lessonDay"), DAYS, store.selectedDay);
    fillSelect($("lessonSubject"), store.timetable[store.selectedDay] || SUBJECTS, store.timetable[store.selectedDay]?.[0]);
    renderDayTabs("teacherDayTabs", store.selectedDay, "tday");
    renderLessons("teacherLessonGrid", store.selectedClass, store.selectedDay);
    renderClassTabs("trackClassTabs", store.selectedClass);
    renderTrackTable("trackTable");
    renderTimetable();
    renderTeacherRank();
  }
}

// --- Event Listeners ---

// Auth Listeners
$("calPrevMonth")?.addEventListener("click", () => {
  currentCalMonth--;
  if (currentCalMonth < 0) {
    currentCalMonth = 11;
    currentCalYear--;
  }
  renderCalendar();
});
$("calNextMonth")?.addEventListener("click", () => {
  currentCalMonth++;
  if (currentCalMonth > 11) {
    currentCalMonth = 0;
    currentCalYear++;
  }
  renderCalendar();
});

$("closeStudentProfile")?.addEventListener("click", () => {
  $("teacherStudentProfile").classList.add("hidden");
  activeProfileStudentId = null;
});

$("profCalPrev")?.addEventListener("click", () => {
  profCalMonth--;
  if (profCalMonth < 0) {
    profCalMonth = 11;
    profCalYear--;
  }
  if (activeProfileStudentId) renderCalendar(activeProfileStudentId, true);
});
$("profCalNext")?.addEventListener("click", () => {
  profCalMonth++;
  if (profCalMonth > 11) {
    profCalMonth = 0;
    profCalYear++;
  }
  if (activeProfileStudentId) renderCalendar(activeProfileStudentId, true);
});

document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    $("loginForm").classList.toggle("hidden", tab.dataset.tab !== "login");
    $("loginForm").classList.toggle("active", tab.dataset.tab === "login");
    $("registerForm").classList.toggle("hidden", tab.dataset.tab !== "register");
    $("registerForm").classList.toggle("active", tab.dataset.tab === "register");

    if (tab.dataset.tab === "register") {
      fillSelect($("regClass"), store.classes, store.classes[0]);
    }
  });
});

$("loginForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const role = $("loginRole").value;
  const id = $("loginId").value.trim();
  const password = $("loginPassword").value.trim();
  $("loginError").textContent = "";

  if (role === 'student') {
    const st = store.students.find(s => s.id === id);
    if (st) {
      if (st.password === password || !st.password) {
        setRole('student', id);
      } else {
        $("loginError").textContent = "Hatalı şifre!";
      }
    }
    else $("loginError").textContent = "Öğrenci numarası bulunamadı!";
  } else {
    const t = store.teachers.find(t => t.id === id);
    if (t) {
      if (t.password === password) {
        setRole('teacher', id);
      } else {
        $("loginError").textContent = "Hatalı şifre!";
      }
    }
    else $("loginError").textContent = "Öğretmen ID'si bulunamadı!";
  }
});

$("registerForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  $("regError").textContent = "";
  try {
    const name = $("regName").value.trim();
    const id = $("regId").value.trim();
    const classId = $("regClass").value;
    const field = $("regField").value;
    const password = $("regPassword").value.trim();

    if (!name || !id || !password) {
      $("regError").textContent = "Lütfen tüm bilgileri eksiksiz girin!";
      return;
    }

    if (store.students.find((s) => s.id === id)) {
      $("regError").textContent = "Bu numara ile kayıtlı öğrenci zaten var! Giriş Yap sekmesini kullanabilirsiniz.";
      return;
    }

    store.students.push({
      id,
      name,
      classId,
      field,
      password,
      avatar: "",
      week: [0, 0, 0, 0, 0, 0, 0],
    });
    saveStore();

    $("regName").value = "";
    $("regId").value = "";
    $("regPassword").value = "";
    setRole("student", id);
  } catch (err) {
    console.error("Kayıt hatası:", err);
    if ($("regError")) $("regError").textContent = "Kayıt işlemi sırasında hata: " + err.message;
  }
});

$("profileFileInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
  if (file.size > MAX_SIZE) {
    alert("Yüklenen dosya çok büyük! Maksimum dosya boyutu 5MB olmalıdır.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (evt) {
    const base64Str = evt.target.result;
    const s = currentStudent();
    if (s) {
      s.avatar = base64Str;
      saveStore();
      renderAll();
      if ($("profileAvatar")) $("profileAvatar").src = base64Str;
    }
  };
  reader.readAsDataURL(file);
});

$("logoutBtn")?.addEventListener("click", logout);

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => {
    button.parentElement.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    showPage(button.dataset.page);
  });
});

if ($("menuToggle")) $("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));

$("solveForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const count = Number($("solvedCount").value);
  if (Number.isNaN(count) || count < 0) {
    $("formNote").textContent = "Lütfen geçerli bir soru sayısı gir.";
    return;
  }
  const student = currentStudent();
  student.week[todayIndex] = count;

  if (!store.history[student.id]) store.history[student.id] = {};
  const goal = todayGoal(student.id);
  const details = goal ? `Hedef: ${goal.count} soru (${goal.subject} - ${goal.topic})` : "";
  store.history[student.id][todayDateStr] = {
    solved: count,
    details: details
  };

  saveStore();
  $("formNote").textContent = goal && count >= goal.count
    ? "Tebrikler, günlük hedefini tamamladın."
    : goal
      ? `Kalan hedef: ${Math.max(goal.count - count, 0)} soru.`
      : "Soru sayın kaydedildi. Hedef için Günlük Hedefler sayfasını kullan.";
  renderAll();
});

$("goalForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = store.currentUser.id;
  const next = {
    day: $("goalDay").value,
    subject: $("goalSubject").value,
    topic: $("goalTopic").value.trim(),
    count: Number($("goalCount").value),
  };
  store.goals[id] = store.goals[id] || [];
  const existing = store.goals[id].findIndex((g) => g.day === next.day && g.subject === next.subject);
  if (existing >= 0) store.goals[id][existing] = next;
  else store.goals[id].push(next);
  $("goalTopic").value = "";
  $("goalCount").value = "";
  saveStore();
  renderAll();
});

$("studentGoalList")?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-del-goal]");
  if (!btn) return;
  store.goals[store.currentUser.id].splice(Number(btn.dataset.delGoal), 1);
  saveStore();
  renderAll();
});

$("lessonForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const rec = {
    classId: $("lessonClass").value,
    day: $("lessonDay").value,
    date: $("lessonDate").value,
    subject: $("lessonSubject").value,
    topic: $("lessonTopic").value.trim(),
  };
  const idx = store.lessons.findIndex(
    (l) => l.classId === rec.classId && l.day === rec.day && l.subject === rec.subject
  );
  if (idx >= 0) store.lessons[idx] = rec;
  else store.lessons.push(rec);
  store.selectedClass = rec.classId;
  store.selectedDay = rec.day;
  $("lessonTopic").value = "";
  saveStore();
  renderAll();
});

$("lessonDay")?.addEventListener("change", () => {
  const subjects = store.timetable[$("lessonDay").value] || [];
  const mapped = subjects.map(item => item.subject);
  fillSelect($("lessonSubject"), mapped.length ? mapped : SUBJECTS);
});

$("timetableForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const day = $("ttDay").value;
  const next = {
    time: $("ttTime").value,
    subject: $("ttSubject").value
  };
  if (!store.timetable[day]) store.timetable[day] = [];
  store.timetable[day].push(next);
  store.timetable[day].sort((a, b) => a.time.localeCompare(b.time));
  saveStore();
  renderAll();
});

$("ttList")?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-del-tt]");
  if (!btn) return;
  store.timetable[store.selectedDay].splice(Number(btn.dataset.delTt), 1);
  saveStore();
  renderAll();
});


document.body.addEventListener("click", (event) => {
  const dayBtn = event.target.closest("[data-day]");
  if (dayBtn) {
    store.selectedDay = dayBtn.dataset.day;
    saveStore();
    renderAll();
  }
  const tdayBtn = event.target.closest("[data-tday]");
  if (tdayBtn) {
    store.selectedDay = tdayBtn.dataset.tday;
    saveStore();
    renderAll();
  }
  const ttdayBtn = event.target.closest("[data-ttday]");
  if (ttdayBtn) {
    store.selectedDay = ttdayBtn.dataset.ttday;
    saveStore();
    renderAll();
  }
  const classBtn = event.target.closest("[data-class]");
  if (classBtn) {
    store.selectedClass = classBtn.dataset.class;
    saveStore();
    renderAll();
  }

  const profRow = event.target.closest(".clickable-row[data-profile-id]");
  if (profRow) {
    openStudentProfile(profRow.dataset.profileId);
  }

  const profCalDayBtn = event.target.closest(".cal-day:not(.empty)[data-for-prof='true']");
  if (profCalDayBtn && activeProfileStudentId) {
    document.querySelectorAll("#profCalendarGrid .cal-day").forEach(el => el.classList.remove("active"));
    profCalDayBtn.classList.add("active");

    const dateStr = profCalDayBtn.dataset.date;
    $("profCalDetailCard").classList.remove("hidden");

    const [y, m, d] = dateStr.split("-");
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    $("profCalDetailDate").textContent = `${parseInt(d)} ${monthNames[parseInt(m) - 1]} ${y}`;

    const hist = (store.history[activeProfileStudentId] || {})[dateStr];
    if (hist) {
      let html = `<p style="font-size: 18px; margin-bottom: 8px;"><strong>${hist.solved || 0}</strong> Soru Çözüldü</p>`;
      if (hist.details) {
        html += `<p style="color: var(--muted);">${hist.details}</p>`;
      }
      $("profCalDetailContent").innerHTML = html;
    } else {
      $("profCalDetailContent").innerHTML = `<p style="color: var(--muted);">Bu tarih için kayıt bulunmuyor.</p>`;
    }
  }

  const calDayBtn = event.target.closest(".cal-day:not(.empty):not([data-for-prof='true'])");
  if (calDayBtn) {
    document.querySelectorAll("#calendarGrid .cal-day").forEach(el => el.classList.remove("active"));
    calDayBtn.classList.add("active");

    const dateStr = calDayBtn.dataset.date;
    $("calDetailCard").classList.remove("hidden");

    const [y, m, d] = dateStr.split("-");
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    $("calDetailDate").textContent = `${parseInt(d)} ${monthNames[parseInt(m) - 1]} ${y}`;

    const s = currentStudent();
    const hist = (store.history[s.id] || {})[dateStr];
    if (hist) {
      let html = `<p style="font-size: 18px; margin-bottom: 8px;"><strong>${hist.solved || 0}</strong> Soru Çözüldü</p>`;
      if (hist.details) {
        html += `<p style="color: var(--muted);">${hist.details}</p>`;
      }
      $("calDetailContent").innerHTML = html;
    } else {
      $("calDetailContent").innerHTML = `<p style="color: var(--muted);">Bu tarih için kayıt bulunmuyor.</p>`;
    }
  }
});

// Initialization
loadStore().then(() => {
  if (store.currentUser) {
    setRole(store.currentUser.role, store.currentUser.id);
    if ($("lessonDate")) $("lessonDate").value = todayDateStr;
  } else {
    // Show auth screen initially
    if ($("auth-screen")) $("auth-screen").classList.remove("hidden");
    if ($("mainApp")) $("mainApp").classList.add("hidden");
    if ($("regClass")) fillSelect($("regClass"), store.classes, store.classes[0]);
  }
});
