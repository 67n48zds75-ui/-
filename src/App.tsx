import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  ListFilter,
  Menu,
  Moon,
  Play,
  Search,
  Sparkles,
  Sun,
  Target,
  Trophy,
  UserRound,
  X,
  Zap,
  ChartNoAxesCombined,
  Shapes,
  Hash,
  Network,
  Scale,
  Brain,
  CheckCircle2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import katex from "katex";
import { problems, topics, type Problem, type Topic } from "./data";
import {
  check,
  csv,
  empty,
  load,
  mastery,
  recommend,
  streak,
  type Progress,
  type Result,
} from "./engine";
const icons = [Activity, Shapes, Hash, Network, Scale, Brain];
function MathText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\$[^$]+\$)/g)
        .map((s, i) =>
          s.startsWith("$") ? (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(s.slice(1, -1), {
                  throwOnError: false,
                  trust: false,
                  strict: "ignore",
                }),
              }}
            />
          ) : (
            <span key={i}>{s}</span>
          ),
        )}
    </>
  );
}
const pages = [
  ["Главная", LayoutDashboard],
  ["Каталог задач", BookOpen],
  ["Статистика", ChartNoAxesCombined],
  ["Мой профиль", UserRound],
] as const;
const fmt = (date: string) =>
  new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
const day = () => new Date().toLocaleDateString("sv-SE");
function initial() {
  try {
    return load(localStorage.getItem("mathlab-v1"));
  } catch {
    return { ...empty };
  }
}
export default function App() {
  const [progress, setProgress] = useState<Progress>(initial),
    [page, setPage] = useState("Главная"),
    [filter, setFilter] = useState<Topic | "">(""),
    [difficulty, setDifficulty] = useState(0),
    [search, setSearch] = useState(""),
    [active, setActive] = useState<Problem | null>(null),
    [answer, setAnswer] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [hints, setHints] = useState(0),
    [attempts, setAttempts] = useState(0),
    [feedback, setFeedback] = useState(""),
    [finished, setFinished] = useState(false),
    [mode, setMode] = useState("Тренировка"),
    [session, setSession] = useState(""),
    [queue, setQueue] = useState<Problem[]>([]),
    [index, setIndex] = useState(0),
    [deadline, setDeadline] = useState(0),
    [seconds, setSeconds] = useState(0),
    [summary, setSummary] = useState(false),
    [mobile, setMobile] = useState(false),
    [storageError, setStorageError] = useState("");
  const results = progress.results,
    solved = new Set(results.filter((r) => r.correct).map((r) => r.id)).size,
    accuracy = results.length
      ? Math.round(
          (results.filter((r) => r.correct).length / results.length) * 100,
        )
      : 0,
    level = Math.min(10, 1 + Math.floor(solved / 6)),
    chain = streak(results);
  const weakest = [...topics].sort(
    (a, b) => mastery(results, a) - mastery(results, b),
  )[0];
  useEffect(() => {
    document.documentElement.dataset.theme = progress.theme;
    try {
      localStorage.setItem("mathlab-v1", JSON.stringify(progress));
      setStorageError("");
    } catch {
      setStorageError(
        "Браузер не разрешил сохранение. Прогресс доступен до закрытия страницы; экспортируйте CSV.",
      );
    }
  }, [progress]);
  useEffect(() => {
    if (!deadline || summary) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, summary]);
  useEffect(() => {
    if (!active && !summary) return;
    const oldFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector("[role=dialog]") as HTMLElement;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),[tabindex="0"]',
        ) ?? [],
      );
    (
      dialog?.querySelector<HTMLElement>(".answer-input") ?? focusable()[0]
    )?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (summary) {
          setSummary(false);
          setDeadline(0);
        } else close();
      }
      if (e.key === "Tab") {
        const list = focusable();
        const first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = oldOverflow;
      oldFocus?.focus();
    };
  }, [active, summary, attempts, hints, finished]);
  useEffect(() => {
    if (deadline && seconds === 0 && Date.now() >= deadline && !summary) {
      if (active && !finished) record(false);
      setActive(null);
      setSummary(true);
    }
  }, [seconds, deadline]);
  function open(p: Problem) {
    setActive(p);
    setAnswer("");
    setSelected([]);
    setHints(0);
    setAttempts(0);
    setFeedback("");
    setFinished(false);
  }
  function start(kind = "Тренировка", p?: Problem) {
    if (kind === "Ежедневная" && daily.length >= 5) return;
    const id = crypto.randomUUID();
    setSession(id);
    setMode(kind);
    setSummary(false);
    setIndex(0);
    const q =
      kind === "Олимпиада"
        ? topics.slice(0, 5).map((t) => recommend(results, t))
        : kind === "Ежедневная"
          ? Array.from({ length: 6 }, (_, i) =>
              recommend(results, topics[(new Date().getDate() + i) % 6]),
            )
              .filter((p) => !daily.some((r) => r.id === p.id))
              .slice(0, 5 - daily.length)
          : [];
    setQueue(q);
    setDeadline(kind === "Олимпиада" ? Date.now() + 20 * 60 * 1000 : 0);
    setSeconds(kind === "Олимпиада" ? 1200 : 0);
    open(p ?? q[0] ?? recommend(results));
  }
  function record(correct: boolean) {
    const r: Result = {
      id: active!.id,
      correct,
      attempts: Math.max(1, attempts + (correct ? 1 : 0)),
      hints,
      date: new Date().toISOString(),
      mode,
      session,
    };
    setProgress((old) => ({
      ...old,
      results: [...old.results, r].slice(-5000),
    }));
    setFinished(true);
  }
  function submit() {
    if (!active || finished) return;
    if (active.type === "multiple" ? !selected.length : !answer.trim()) {
      setFeedback("Сначала укажите ответ.");
      return;
    }
    if (check(active, active.type === "multiple" ? selected : answer)) {
      record(true);
      setFeedback("Верно! Отличная работа.");
    } else {
      setAttempts((a) => Math.min(99, a + 1));
      setFeedback(
        "Пока неверно. Попробуйте ещё раз или воспользуйтесь подсказкой.",
      );
    }
  }
  function next() {
    if (queue.length) {
      if (index + 1 >= queue.length) {
        setActive(null);
        setSummary(true);
        return;
      }
      setIndex(index + 1);
      open(queue[index + 1]);
    } else open(recommend(results));
  }
  function close() {
    if (!finished && (attempts > 0 || hints > 0)) record(false);
    setActive(null);
    setDeadline(0);
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob([csv(results)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "mathlab-statistics.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const topicData = topics.map((t) => ({
    name: t,
    value: mastery(results, t),
  }));
  const dateKeys = [...new Set(results.map((r) => r.date.slice(0, 10)))].slice(
    -14,
  );
  const chartData = dateKeys.map((d) => {
    const rs = results.filter((r) => r.date.startsWith(d));
    return {
      name: fmt(d),
      value: Math.round((rs.filter((r) => r.correct).length / rs.length) * 100),
    };
  });
  const daily = results.filter(
    (r) =>
      r.mode === "Ежедневная" &&
      new Date(r.date).toLocaleDateString("sv-SE") === day(),
  );
  const badges = [
    {
      name: "Первый шаг",
      desc: "Решите первую задачу",
      done: solved >= 1,
      icon: Zap,
    },
    {
      name: "В потоке",
      desc: "5 правильных ответов подряд",
      done: results.some(
        (_, i) => i >= 4 && results.slice(i - 4, i + 1).every((r) => r.correct),
      ),
      icon: Flame,
    },
    {
      name: "Исследователь",
      desc: "Решите задачи всех 6 тем",
      done: topics.every((t) =>
        results.some(
          (r) => r.correct && problems.find((p) => p.id === r.id)?.topic === t,
        ),
      ),
      icon: Search,
    },
    {
      name: "Математик",
      desc: "Решите 30 разных задач",
      done: solved >= 30,
      icon: Trophy,
    },
  ];
  function history() {
    return results.length ? (
      <div className="history">
        {[...results]
          .reverse()
          .slice(0, 30)
          .map((r, i) => {
            const p = problems.find((p) => p.id === r.id)!;
            return (
              <div key={i}>
                <span className={"result-dot " + (r.correct ? "good" : "bad")}>
                  {r.correct ? <Check size={15} /> : <X size={15} />}
                </span>
                <span className="grow">
                  <b>{p.title}</b>
                  <small>
                    {p.topic} · {r.mode} · {r.attempts} попыт. · {r.hints}{" "}
                    подсказ.
                  </small>
                </span>
                <span className="muted">{fmt(r.date)}</span>
              </div>
            );
          })}
      </div>
    ) : (
      <div className="empty">
        <BookOpen />
        <p>Здесь появятся ваши решения</p>
        <small>Начните с первой тренировки — всё остальное мы сохраним.</small>
      </div>
    );
  }
  function chart() {
    return chartData.length ? (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="4 4"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            width={35}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            unit="%"
          />
          <Tooltip formatter={(v) => [`${v}%`, "Верные ответы"]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#area)"
            dot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    ) : (
      <div className="chart-empty">
        <div className="grid-lines" />
        <div>
          <ChartNoAxesCombined size={27} />
          <b>Каждое решение — шаг вперёд</b>
          <span>Ваш прогресс появится здесь после тренировки</span>
        </div>
        <span className="axis-label">
          0% <span>100%</span>
        </span>
      </div>
    );
  }
  return (
    <div className="shell">
      <aside className={mobile ? "sidebar mobile-open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Главная");
            setMobile(false);
          }}
        >
          <span className="logo">
            M<span>·</span>
          </span>
          MathLab<span className="brand-dot">.</span>
        </a>
        <span className="sidebar-label">ПРОСТРАНСТВО РОСТА</span>
        <nav>
          {pages.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "nav-item current" : "nav-item"}
              onClick={() => {
                setPage(name);
                setMobile(false);
              }}
            >
              <Icon size={19} />
              {name}
              {name === "Каталог задач" && (
                <span className="nav-count">62</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <button
          className="nav-item"
          onClick={() => {
            start("Олимпиада");
            setMobile(false);
          }}
        >
          <Trophy size={19} />
          Режим олимпиады<span className="tiny">NEW</span>
        </button>
        <div className="side-bottom">
          <div className="tip-card">
            <span className="tip-icon">
              <Sparkles size={19} />
            </span>
            <b>
              Большие идеи начинаются
              <br />с маленьких шагов.
            </b>
            <p>
              Даже одна задача в день
              <br />
              делает вас сильнее.
            </p>
            <span className="tip-decoration">∑</span>
          </div>
          <button
            className="theme-switch"
            onClick={() =>
              setProgress((p) => ({
                ...p,
                theme: p.theme === "light" ? "dark" : "light",
              }))
            }
          >
            {progress.theme === "light" ? (
              <Moon size={18} />
            ) : (
              <Sun size={18} />
            )}{" "}
            {progress.theme === "light" ? "Тёмная тема" : "Светлая тема"}
            <span className="toggle">
              <i />
            </span>
          </button>
          <div className="local-label">
            <span /> Прогресс хранится на устройстве
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <button
            className="mobile-toggle icon-btn"
            aria-label="Открыть меню"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Моё обучение <ChevronRight size={13} /> <b>{page}</b>
          </div>
          <div className="header-right">
            <span className="offline">
              <span /> Без регистрации
            </span>
            <span className="header-line" />
            <button
              className="avatar"
              onClick={() => setPage("Мой профиль")}
              aria-label="Мой профиль"
            >
              М
            </button>
          </div>
        </header>
        <main>
          {storageError && <div className="notice">{storageError}</div>}
          <div className="page-heading">
            <div>
              <div className="eyebrow">ВАШ ПУТЬ В МАТЕМАТИКЕ</div>
              <h1>
                {page === "Главная"
                  ? "Время для новых открытий"
                  : page === "Каталог задач"
                    ? "Задачи, которые развивают"
                    : page === "Статистика"
                      ? "Ваш прогресс в деталях"
                      : "Мой математический путь"}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {page === "Главная"
                  ? "Тренируйтесь в своём темпе. Мы поможем найти следующий шаг."
                  : page === "Каталог задач"
                    ? "От первых идей до красивых решений — выберите свой вызов."
                    : page === "Статистика"
                      ? "Замечайте сильные стороны и находите точки роста."
                      : "Каждая попытка приближает к новому уровню."}
              </p>
            </div>
            <div className="date-chip">
              <span />{" "}
              {new Date().toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
            </div>
          </div>
          {page === "Главная" && (
            <>
              <section className="hero">
                <div className="hero-content">
                  <span className="hero-label">
                    <Sparkles size={14} /> ПОДОБРАНО ДЛЯ ВАС
                  </span>
                  <h2>
                    Не просто решать.
                    <br />
                    Понимать математику.
                  </h2>
                  <p>
                    Задачи подстраиваются под ваш уровень,
                    <br />а каждая попытка помогает двигаться дальше.
                  </p>
                  <button className="primary" onClick={() => start()}>
                    <Play size={16} fill="currentColor" /> Начать тренировку{" "}
                    <ArrowRight size={18} />
                  </button>
                  <span className="hero-meta">
                    В вашем темпе <span>·</span> 6 направлений <span>·</span>{" "}
                    Без оценок
                  </span>
                </div>
                <div className="math-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <span className="formula f1">x² + y² = r²</span>
                  <span className="formula f2">a² + b² = c²</span>
                  <span className="formula f3">∞</span>
                  <span className="formula f4">√x</span>
                  <div className="graph-art">
                    <div className="graph-axis x-axis" />
                    <div className="graph-axis y-axis" />
                    <svg viewBox="0 0 250 180">
                      <path
                        d="M20 140 Q125 -45 225 140"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                      <path
                        d="M30 160 L130 30 L220 160 Z"
                        fill="#dceaff66"
                        stroke="#7198cb"
                        strokeWidth="1.5"
                      />
                      <circle cx="130" cy="30" r="5" fill="#2563eb" />
                      <circle cx="30" cy="160" r="4" fill="#2563eb" />
                      <circle cx="220" cy="160" r="4" fill="#2563eb" />
                    </svg>
                    <span className="point-a">A</span>
                    <span className="point-b">B</span>
                    <span className="point-c">C</span>
                  </div>
                  <div className="float-card">
                    <span>
                      <Target size={20} />
                    </span>
                    <div>
                      <b>Ваш следующий уровень</b>
                      <small>На одну задачу ближе</small>
                    </div>
                    <ArrowUpRight size={18} />
                  </div>
                </div>
              </section>
              <section className="stats-grid">
                {[
                  {
                    label: "Решено задач",
                    value: solved,
                    unit: `из ${problems.length}`,
                    icon: BookOpen,
                    color: "blue",
                    note: solved
                      ? "Продолжайте исследовать"
                      : "Всё начинается с первой задачи",
                  },
                  {
                    label: "Правильных ответов",
                    value: `${accuracy}%`,
                    unit: "",
                    icon: Target,
                    color: "green",
                    note: results.length
                      ? `${results.length} завершённых попыток`
                      : "Ваш личный темп обучения",
                  },
                  {
                    label: "Текущий уровень",
                    value: level,
                    unit: "/ 10",
                    icon: ChartNoAxesCombined,
                    color: "blue",
                    note: [
                      "Исследователь",
                      "Искатель идей",
                      "Практик",
                      "Знаток",
                    ][Math.min(3, Math.floor(level / 3))],
                  },
                  {
                    label: "Серия верных ответов",
                    value: chain,
                    unit: "подряд",
                    icon: Flame,
                    color: "orange",
                    note: chain
                      ? "Отличный ритм!"
                      : "Соберите свою первую серию",
                  },
                ].map(({ label, value, unit, icon: Icon, color, note }) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-top">
                      <span>{label}</span>
                      <span className={`stat-icon ${color}`}>
                        <Icon size={18} />
                      </span>
                    </div>
                    <div className="stat-value">
                      {value}
                      <small>{unit}</small>
                    </div>
                    <div className="stat-note">{note}</div>
                  </div>
                ))}
              </section>
              <div className="dashboard-columns">
                <section className="panel progress-panel">
                  <div className="section-top">
                    <div>
                      <h3>Ваш прогресс</h3>
                      <p>Правильные ответы за дни тренировок</p>
                    </div>
                    <span className="subtle-chip">
                      Последние 14 дней активности
                    </span>
                  </div>
                  <div className="chart-legend">
                    <span /> Верные ответы
                  </div>
                  {chart()}
                </section>
                <section className="panel daily-panel">
                  <div className="daily-top">
                    <span className="stat-icon orange">
                      <Zap size={19} />
                    </span>
                    <span className="subtle-chip">КАЖДЫЙ ДЕНЬ</span>
                  </div>
                  <h3>
                    Маленькая тренировка.
                    <br />
                    Большой результат.
                  </h3>
                  <p>
                    5 задач из разных тем, чтобы
                    <br />
                    держать математическую форму.
                  </p>
                  <div className="daily-meta">
                    <span>
                      <Clock size={14} /> ~15 минут
                    </span>
                    <span>
                      <BookOpen size={14} /> 5 задач
                    </span>
                  </div>
                  <div className="daily-progress">
                    <span
                      style={{
                        width: `${Math.min(100, (daily.length / 5) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="daily-caption">
                    Сегодня завершено {daily.length} из 5 задач
                  </div>
                  <button
                    className="secondary"
                    disabled={daily.length >= 5}
                    onClick={() => start("Ежедневная")}
                  >
                    {daily.length >= 5
                      ? "На сегодня всё — отлично!"
                      : "Тренировка дня"}{" "}
                    <ArrowRight size={17} />
                  </button>
                </section>
              </div>
              <section className="topics-section">
                <div className="section-top">
                  <div>
                    <h3>Исследуйте направления</h3>
                    <p>Шесть способов посмотреть на математику</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setPage("Каталог задач")}
                  >
                    Все задачи <ArrowRight size={16} />
                  </button>
                </div>
                <div className="topic-grid">
                  {topics.map((t, i) => {
                    const Icon = icons[i];
                    return (
                      <button
                        key={t}
                        className="topic-card"
                        onClick={() => {
                          setFilter(t);
                          setPage("Каталог задач");
                        }}
                      >
                        <span className={`topic-icon topic-${i}`}>
                          <Icon size={22} />
                        </span>
                        <span className="topic-name">{t}</span>
                        <span className="topic-description">
                          {
                            [
                              "Закономерности и уравнения",
                              "Формы, углы и доказательства",
                              "Секреты целых чисел",
                              "Искусство считать варианты",
                              "Красота точных оценок",
                              "Нестандартный взгляд",
                            ][i]
                          }
                        </span>
                        <div className="topic-bottom">
                          <span>
                            {problems.filter((p) => p.topic === t).length} задач
                          </span>
                          <ArrowUpRight size={17} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="recommend-banner">
                <span className="stat-icon blue">
                  <Lightbulb size={21} />
                </span>
                <div>
                  <b>
                    {results.length
                      ? `Стоит повторить: ${weakest.toLowerCase()}`
                      : "Не знаете, с чего начать?"}
                  </b>
                  <p>
                    {results.length
                      ? "Подобрали задачи, которые помогут укрепить понимание темы."
                      : "Начните тренировку — мы постепенно определим ваш уровень и подберём задачи."}
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() =>
                    start("Тренировка", recommend(results, weakest))
                  }
                >
                  Попробовать <ArrowRight size={17} />
                </button>
              </section>
            </>
          )}
          {page === "Каталог задач" && (
            <>
              <section className="panel filters">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Поиск задач"
                    placeholder="Найти интересную задачу…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="filter-select">
                  <ListFilter size={16} />
                  <select
                    aria-label="Тема"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as Topic | "")}
                  >
                    <option value="">Все направления</option>
                    {topics.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <select
                  aria-label="Сложность"
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                >
                  <option value={0}>Любая сложность</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      Уровень {i + 1} из 10
                    </option>
                  ))}
                </select>
                <button
                  className="icon-btn"
                  aria-label="Сбросить фильтры"
                  onClick={() => {
                    setFilter("");
                    setDifficulty(0);
                    setSearch("");
                  }}
                >
                  <X size={18} />
                </button>
              </section>
              <div className="catalog-count">
                Найдено{" "}
                {
                  problems.filter(
                    (p) =>
                      (!filter || p.topic === filter) &&
                      (!difficulty || p.difficulty === difficulty) &&
                      `${p.title} ${p.statement}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  ).length
                }{" "}
                задач <span>Сложность — предварительная авторская оценка</span>
              </div>
              <div className="problem-grid">
                {problems
                  .filter(
                    (p) =>
                      (!filter || p.topic === filter) &&
                      (!difficulty || p.difficulty === difficulty) &&
                      `${p.title} ${p.statement}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      className="problem-card panel"
                      key={p.id}
                      onClick={() => start("Свободная практика", p)}
                    >
                      <div>
                        <span className="subtle-chip">{p.topic}</span>
                        {results.some((r) => r.id === p.id && r.correct) && (
                          <CheckCircle2 size={18} className="green-text" />
                        )}
                      </div>
                      <h3>{p.title}</h3>
                      <p>
                        <MathText text={p.statement} />
                      </p>
                      <div className="problem-bottom">
                        <span className="difficulty-bars">
                          {Array.from({ length: 10 }, (_, i) => (
                            <i
                              key={i}
                              className={i < p.difficulty ? "filled" : ""}
                            />
                          ))}
                        </span>
                        <span>
                          {p.difficulty}/10 <ArrowUpRight size={16} />
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </>
          )}
          {page === "Статистика" && (
            <>
              <div className="section-top">
                <div>
                  <h3>Все ваши результаты</h3>
                  <p>Реальные данные из этого браузера</p>
                </div>
                <button className="secondary compact" onClick={exportCsv}>
                  <ArrowDownToLine size={17} /> Экспорт CSV
                </button>
              </div>
              <div className="analytics-grid">
                <section className="panel">
                  <h3>Динамика правильных ответов</h3>
                  {chart()}
                </section>
                <section className="panel">
                  <h3>Освоение направлений</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={topicData}
                      layout="vertical"
                      margin={{ left: 5, right: 20 }}
                    >
                      <CartesianGrid
                        horizontal={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 11, fill: "var(--muted)" }}
                      />
                      <Tooltip formatter={(v) => [`${v}%`, "Освоение"]} />
                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </section>
                <section className="panel">
                  <h3>Решённые задачи по сложности</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={Array.from({ length: 10 }, (_, i) => ({
                        name: i + 1,
                        value: new Set(
                          results
                            .filter(
                              (r) =>
                                r.correct &&
                                problems.find((p) => p.id === r.id)
                                  ?.difficulty ===
                                  i + 1,
                            )
                            .map((r) => r.id),
                        ).size,
                      }))}
                    >
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(v) => [v, "Решено задач"]} />
                      <Bar
                        dataKey="value"
                        fill="#6390e9"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </section>
                <section className="panel">
                  <h3>История тренировок</h3>
                  {[...new Set(results.map((r) => r.session))]
                    .reverse()
                    .slice(0, 8)
                    .map((s) => {
                      const rs = results.filter((r) => r.session === s);
                      return (
                        <div className="session-row" key={s}>
                          <Clock size={18} />
                          <div className="grow">
                            <b>{rs[0].mode}</b>
                            <small>{fmt(rs[0].date)}</small>
                          </div>
                          <span>
                            {rs.filter((r) => r.correct).length} / {rs.length}{" "}
                            верно
                          </span>
                        </div>
                      );
                    })}
                  {!results.length && (
                    <p className="empty">Пока нет завершённых тренировок</p>
                  )}
                </section>
              </div>
              <section className="panel">
                <h3>История решений</h3>
                {history()}
              </section>
            </>
          )}
          {page === "Мой профиль" && (
            <>
              <section className="profile-hero panel">
                <div className="big-avatar">М</div>
                <div className="grow">
                  <span className="eyebrow">ВАШ ЛОКАЛЬНЫЙ ПРОФИЛЬ</span>
                  <h2>Исследователь математики</h2>
                  <p>
                    Уровень {level} · {solved} решённых задач · {chain} ответов
                    подряд
                  </p>
                  <div className="level-progress">
                    <span style={{ width: `${((solved % 6) / 6) * 100}%` }} />
                  </div>
                  <small>
                    До следующего уровня:{" "}
                    {level === 10
                      ? "максимальный уровень"
                      : `${6 - (solved % 6)} новых решений`}
                  </small>
                </div>
                <GraduationCap size={70} strokeWidth={1} />
              </section>
              <div className="section-top">
                <h3>Ваша коллекция достижений</h3>
                <span className="muted">
                  {badges.filter((b) => b.done).length} из 4 открыто
                </span>
              </div>
              <div className="badges">
                {badges.map((b) => (
                  <div
                    className={"panel badge " + (b.done ? "earned" : "")}
                    key={b.name}
                  >
                    <b.icon size={30} />
                    <h3>{b.name}</h3>
                    <p>{b.desc}</p>
                    <span>{b.done ? "Получено" : "Пока закрыто"}</span>
                  </div>
                ))}
              </div>
              <section className="panel">
                <h3>Точки роста</h3>
                <p className="muted">
                  Оценка учитывает последние 8 попыток, подсказки и повторные
                  ответы.
                </p>
                {topics.map((t) => (
                  <div className="mastery-row" key={t}>
                    <span>{t}</span>
                    <div className="level-progress">
                      <span style={{ width: `${mastery(results, t)}%` }} />
                    </div>
                    <b>{mastery(results, t)}%</b>
                    <button
                      className="text-button"
                      onClick={() => start("Повторение", recommend(results, t))}
                    >
                      Практика <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </section>
              <section className="panel history-panel">
                <div className="section-top">
                  <h3>Последние решения</h3>
                  <button className="text-button" onClick={exportCsv}>
                    <ArrowDownToLine size={16} /> CSV
                  </button>
                </div>
                {history()}
              </section>
            </>
          )}
          <footer>
            <span>
              <span className="footer-brand">MathLab</span> Математика
              начинается с любопытства.
            </span>
            <span>Учебный проект · 9–11 классы</span>
          </footer>
        </main>
      </div>
      {active && (
        <div className="modal-backdrop">
          <section
            className="solver"
            role="dialog"
            aria-modal="true"
            aria-labelledby="solver-title"
          >
            <div className="solver-header">
              <span>
                <span className="blue-text">{mode}</span>{" "}
                {queue.length ? `· ${index + 1} из ${queue.length}` : ""}
              </span>
              <div>
                {deadline > 0 && (
                  <span className={"timer " + (seconds < 60 ? "bad-text" : "")}>
                    <Clock size={16} />
                    {Math.floor(seconds / 60)}:
                    {String(seconds % 60).padStart(2, "0")}
                  </span>
                )}
                <button
                  className="icon-btn"
                  aria-label="Закрыть задачу"
                  onClick={close}
                >
                  <X />
                </button>
              </div>
            </div>
            <div className="solver-body">
              <div className="solver-tags">
                <span className="subtle-chip">{active.topic}</span>
                <span className="muted">Сложность {active.difficulty}/10</span>
              </div>
              <h2 id="solver-title">{active.title}</h2>
              <div className="statement">
                <MathText text={active.statement} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <label className="answer-label">
                  {active.type === "multiple"
                    ? "Выберите все подходящие варианты"
                    : "Ваш ответ"}
                </label>
                {active.type === "number" ? (
                  <input
                    className="answer-input"
                    aria-label="Ваш ответ"
                    placeholder="Например, 7 или 1/2"
                    value={answer}
                    maxLength={80}
                    disabled={finished}
                    onChange={(e) => setAnswer(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div className="answer-options">
                    {active.options?.map((o) => (
                      <label key={o}>
                        <input
                          disabled={finished}
                          type={
                            active.type === "multiple" ? "checkbox" : "radio"
                          }
                          name="answer"
                          checked={
                            active.type === "multiple"
                              ? selected.includes(o)
                              : answer === o
                          }
                          onChange={() =>
                            active.type === "multiple"
                              ? setSelected((s) =>
                                  s.includes(o)
                                    ? s.filter((v) => v !== o)
                                    : [...s, o],
                                )
                              : setAnswer(o)
                          }
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                )}
                <div className="answer-note">
                  {active.type === "number"
                    ? "Можно вводить целые числа, десятичные дроби и обычные дроби."
                    : active.type === "multiple"
                      ? "Верный ответ должен содержать все подходящие варианты."
                      : "Выберите один вариант."}
                </div>
                {!finished && (
                  <div className="solver-actions">
                    <button className="primary" type="submit">
                      <Check size={17} />
                      Проверить ответ
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        record(false);
                        setFeedback(
                          "Попытка завершена. Изучите решение и попробуйте похожую задачу.",
                        );
                      }}
                    >
                      Завершить и узнать решение
                    </button>
                  </div>
                )}
              </form>
              {feedback && (
                <div
                  className={
                    "feedback " +
                    (finished &&
                    check(
                      active,
                      active.type === "multiple" ? selected : answer,
                    )
                      ? "success"
                      : "")
                  }
                  role="status"
                >
                  {feedback}
                </div>
              )}
              {mode !== "Олимпиада" && (
                <div className="hints">
                  <button
                    className="hint-button"
                    disabled={hints >= 3 || finished}
                    onClick={() => setHints((h) => h + 1)}
                  >
                    <Lightbulb size={18} /> Подсказка {Math.min(hints + 1, 3)}{" "}
                    из 3{" "}
                    <span>
                      {hints >= 3
                        ? "Все открыты"
                        : finished
                          ? "Попытка завершена"
                          : "Открыть последовательно"}
                    </span>
                  </button>
                  {active.hints.slice(0, hints).map((h, i) => (
                    <p key={i}>
                      <b>{i + 1}.</b> <MathText text={h} />
                    </p>
                  ))}
                </div>
              )}
              {mode === "Олимпиада" && !finished && (
                <p className="muted">
                  В режиме олимпиады подсказки отключены. На 5 задач отведено 20
                  минут.
                </p>
              )}
              {finished && (
                <section className="solution">
                  <h3>
                    <CheckCircle2 size={20} /> Разбор решения
                  </h3>
                  <div className="correct-answer">
                    Ответ: <b>{active.answer.replaceAll("|", ", ")}</b>
                  </div>
                  {active.solution.map((s, i) => (
                    <div className="solution-step" key={i}>
                      <span>{i + 1}</span>
                      <p>
                        <MathText text={s} />
                      </p>
                    </div>
                  ))}
                  <div className="key-idea">
                    <b>
                      <Lightbulb size={17} /> Ключевая идея
                    </b>
                    <p>
                      <MathText text={active.idea} />
                    </p>
                  </div>
                  <button className="primary" onClick={next}>
                    {queue.length && index + 1 >= queue.length
                      ? "Итоги тренировки"
                      : "Следующая задача"}
                    <ArrowRight size={18} />
                  </button>
                </section>
              )}
            </div>
          </section>
        </div>
      )}
      {summary && (
        <div className="modal-backdrop">
          <section
            className="summary panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-title"
          >
            <span className="summary-icon">
              <Trophy size={36} />
            </span>
            <h2 id="summary-title">Тренировка завершена!</h2>
            <p>
              {mode === "Олимпиада" && seconds === 0
                ? "Время олимпиады истекло."
                : "Ещё один шаг в понимании математики."}
            </p>
            <strong>
              {results.filter((r) => r.session === session && r.correct).length}{" "}
              / {queue.length}
            </strong>
            <p>задач решено верно</p>
            <small>
              Завершено попыток:{" "}
              {results.filter((r) => r.session === session).length}.
              Незавершённые задачи не считаются решёнными.
            </small>
            <button
              className="primary"
              onClick={() => {
                setSummary(false);
                setDeadline(0);
                setPage("Статистика");
              }}
            >
              Посмотреть статистику <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
