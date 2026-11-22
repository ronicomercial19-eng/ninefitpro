import { useIsMobile } from "@/hooks/use-mobile";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import {
  coreWorkday,
  filterWorkday,
  prescriptionLabels,
  type WorkdayFilter,
} from "@/lib/coreWorkday";
import type { CoachOverviewRow } from "@/lib/professorOverview";
import { withAthlete } from "@/lib/professorWorkspace";
import "./core-workday.css";
interface Props {
  rows: CoachOverviewRow[] | undefined;
  loading: boolean;
  error: boolean;
  period: number;
  start: string;
  end: string;
  generatedAt?: string;
  scopeName?: string;
  link: (path: string) => string;
  onPeriodChange: (period: number) => void;
  onRefresh: () => void;
  children?: ReactNode;
}
export function CoreWorkdayView({
  rows,
  loading,
  error,
  period,
  start,
  end,
  generatedAt,
  scopeName,
  link,
  onPeriodChange,
  onRefresh,
  children,
}: Props) {
  const pageSize = useIsMobile() ? 4 : 8;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<WorkdayFilter>("all");
  const [cursor, setCursor] = useState({ key: "", page: 0 });
  const known = !error && Array.isArray(rows);
  const data = coreWorkday(known ? rows! : [], end);
  const filtered = filterWorkday(data.students, search, filter);
  const key = [search, filter, period, scopeName].join(":");
  const page = Math.min(
    cursor.key === key ? cursor.page : 0,
    Math.max(0, Math.ceil(filtered.length / pageSize) - 1)
  );
  const visible = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const date = (value: string) => value.split("-").reverse().join("/");
  const update =
    generatedAt && Number.isFinite(Date.parse(generatedAt))
      ? new Date(generatedAt).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  const categories = [
    { key: "current", label: "Vigente", count: data.summary.current },
    {
      key: "withoutEndDate",
      label: "Sem vencimento",
      count: data.summary.withoutEndDate,
    },
    { key: "expired", label: "Prazo encerrado", count: data.summary.expired },
    {
      key: "withoutTraining",
      label: "Sem atribuição",
      count: data.summary.withoutTraining,
    },
  ];
  return (
    <div className="core-workday">
      <header className="core-workday-hero">
        <div className="core-workday-orbit" aria-hidden="true" />
        <div className="relative">
          <p className="core-workday-eyebrow">NINE CORE / Mesa de trabalho</p>
          <h1>
            {scopeName
              ? `Acompanhamento de ${scopeName}`
              : "Seu dia de acompanhamento."}
          </h1>
          <p className="core-workday-lead">
            Veja as revisões relatadas, confira as prescrições e acompanhe o
            retorno dos alunos. O contexto permanece com você ao abrir cada
            ficha.
          </p>
          <div className="core-workday-actions">
            {scopeName ? (
              <Link
                className="core-workday-primary"
                to={link("/app/acompanhamento")}
              >
                Abrir acompanhamento
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            ) : (
              <a className="core-workday-primary" href="#core-review-queues">
                Ver revisões de hoje
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            )}
            <Link className="core-workday-ghost" to={link("/app/agenda")}>
              <CalendarDays size={16} aria-hidden="true" />
              Minha agenda
            </Link>
          </div>
        </div>
        <div className="core-workday-purpose">
          <span className="core-workday-eyebrow">Da prescrição ao retorno</span>
          <ol>
            {[
              "Você prepara a sessão",
              "O aluno recebe e registra",
              "Você revisa com contexto",
            ].map((step, i) => (
              <li key={step}>
                <span>0{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </header>
      <section
        id="core-review-queues"
        aria-label="Filas de revisão"
        className="core-workday-section"
      >
        <div className="core-workday-section-heading">
          <div>
            <p className="core-workday-eyebrow">
              01 / Conferir o que pede revisão
            </p>
            <h2>Sinais e preparação do treino</h2>
            <p>
              As filas abaixo abrangem toda a sua carteira autorizada, mesmo
              quando há um aluno em foco.
            </p>
          </div>
        </div>
        <div className="core-workday-inboxes">{children}</div>
      </section>
      <section
        aria-label="Indicadores da carteira"
        className="core-workday-section"
      >
        <div className="core-workday-section-heading">
          <div>
            <p className="core-workday-eyebrow">02 / Ler o contexto</p>
            <h2>
              {scopeName ? "Aluno em foco" : "Sua carteira, com contexto"}
            </h2>
            <p>
              {scopeName || "Carteira autorizada"} · {date(start)} a {date(end)}{" "}
              · horário de São Paulo
            </p>
          </div>
          <div className="core-workday-toolbar">
            <label className="sr-only" htmlFor="core-period">
              Período dos indicadores
            </label>
            <select
              id="core-period"
              value={period}
              onChange={(e) => onPeriodChange(Number(e.target.value))}
            >
              {[7, 30, 90].map((n) => (
                <option key={n} value={n}>
                  Últimos {n} dias
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="core-workday-ghost"
            >
              <RefreshCw size={15} aria-hidden="true" />
              Atualizar
            </button>
          </div>
        </div>
        {error && (
          <div role="alert" className="core-workday-notice">
            Não foi possível confirmar os indicadores. Tente atualizar; as filas
            de revisão abaixo têm consultas próprias.
          </div>
        )}
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            Consultando os indicadores…
          </p>
        )}
        <div className="core-workday-metrics">
          {[
            {
              label: "Alunos ativos",
              value: data.summary.active,
              description: "Perfil ativado neste escopo",
              icon: Users,
            },
            {
              label: "Sessões concluídas",
              value: data.summary.completed,
              description: `Registros de execução nos últimos ${period} dias`,
              icon: Activity,
            },
            {
              label: "Sessões prescritas",
              value: data.summary.prescribed,
              description: "Prescrição e execução são contagens distintas",
              icon: ClipboardList,
            },
          ].map(({ label, value, description, icon: Icon }) => (
            <article key={label}>
              <div className="flex items-center justify-between gap-2">
                <h3>{label}</h3>
                <Icon size={18} aria-hidden="true" />
              </div>
              <strong>{known ? value : "—"}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="core-workday-coverage">
          <div>
            <h3>Situação das atribuições hoje</h3>
            <p>
              A mesma pessoa entra em uma categoria. Sem vencimento não
              significa vencida.
            </p>
          </div>
          <div>
            {known ? (
              data.summary.students ? (
                <>
                  <div className="core-workday-coverage-bar" aria-hidden="true">
                    {categories.map((c) => (
                      <span
                        key={c.key}
                        data-tone={c.key}
                        style={{
                          width: `${(c.count / data.summary.students) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  <ul>
                    {categories.map((c) => (
                      <li key={c.key}>
                        <span className="core-workday-dot" data-tone={c.key} />
                        {c.label}
                        <strong>{c.count}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>
                  Nenhum aluno neste escopo. Comece organizando sua carteira.
                </p>
              )
            ) : (
              <p>Distribuição não confirmada nesta leitura.</p>
            )}
          </div>
        </div>
        {update && (
          <p className="core-workday-source">
            Leitura de {update}. A situação das atribuições considera a data
            atual; o período filtra os registros de execução.
          </p>
        )}
      </section>
      <section className="core-workday-section" aria-label="Retorno dos alunos">
        <div className="core-workday-section-heading">
          <div>
            <p className="core-workday-eyebrow">
              03 / Abrir a próxima conversa
            </p>
            <h2>Do registro à revisão individual</h2>
            <p>
              Confira a ficha antes de decidir um ajuste. Ausência de registro
              não comprova ausência de treino.
            </p>
          </div>
          <Link className="core-workday-ghost" to={link("/app/alunos")}>
            Gerenciar alunos
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="core-workday-roster-tools">
          <label className="core-workday-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Buscar nos indicadores da carteira</span>
            <input
              type="search"
              placeholder="Buscar aluno pelo nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div role="group" aria-label="Filtrar retorno dos alunos">
            {(
              [
                { key: "all", label: "Todos" },
                { key: "planning", label: "Revisar prescrição" },
                { key: "no-records", label: "Sem sessão registrada" },
              ] as const
            ).map((item) => (
              <button
                type="button"
                key={item.key}
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {!known ? (
          <p role="status" className="core-workday-notice">
            {loading
              ? "Carregando o retorno dos alunos…"
              : "O retorno dos alunos depende de uma leitura confirmada."}
          </p>
        ) : !data.students.length ? (
          <div className="core-workday-empty">
            <Users size={30} aria-hidden="true" />
            <h3>Sua carteira começa pelo primeiro aluno.</h3>
            <p>
              Organize o acesso e as informações do aluno antes de preparar a
              prescrição.
            </p>
            <Link className="core-workday-primary" to="/app/alunos">
              Abrir minha carteira
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <p className="core-workday-source" aria-live="polite">
              {filtered.length}{" "}
              {filtered.length === 1
                ? "aluno neste filtro"
                : "alunos neste filtro"}{" "}
              · prioridades de prescrição primeiro
            </p>
            <div className="core-workday-roster">
              {visible.map((row) => (
                <article key={row.id}>
                  <div className="core-workday-person">
                    <span className="core-workday-avatar" aria-hidden="true">
                      {row.name
                        .split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <h3>{row.name}</h3>
                      <p
                        className="core-workday-badge"
                        data-state={row.prescription}
                      >
                        {!row.active
                          ? "Perfil não ativado"
                          : prescriptionLabels[row.prescription]}
                      </p>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Concluídas</dt>
                      <dd>{row.completed_workouts}</dd>
                    </div>
                    <div>
                      <dt>Prescritas</dt>
                      <dd>{row.prescribed_sessions}</dd>
                    </div>
                    <div>
                      <dt>Esforço médio</dt>
                      <dd>
                        {row.avg_rpe == null
                          ? "Não informado"
                          : `${row.avg_rpe}/10`}
                      </dd>
                    </div>
                    <div>
                      <dt>Tempo registrado</dt>
                      <dd>{row.duration_minutes} min</dd>
                    </div>
                  </dl>
                  <Link
                    to={withAthlete("/app/acompanhamento", row.id)}
                    data-nine-core-transition="student"
                    className="core-workday-row-link"
                    aria-label={`Abrir ficha de ${row.name}`}
                  >
                    Abrir ficha
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
            {!filtered.length && (
              <p className="core-workday-notice">
                Nenhum aluno corresponde à busca e ao filtro. Experimente outra
                combinação.
              </p>
            )}
            {filtered.length > pageSize && (
              <nav
                aria-label="Paginação dos alunos"
                className="core-workday-pagination"
              >
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setCursor({ key, page: page - 1 })}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Anterior
                </button>
                <span>
                  {page + 1} de {Math.ceil(filtered.length / pageSize)}
                </span>
                <button
                  type="button"
                  disabled={(page + 1) * pageSize >= filtered.length}
                  onClick={() => setCursor({ key, page: page + 1 })}
                >
                  Próxima
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        )}
        <details className="core-workday-method">
          <summary>Como usar estes números na revisão</summary>
          <p>
            Prescrição indica o que foi preparado; conclusão indica o que voltou
            do Train como registro. Esforço médio é o relato do aluno, não uma
            nota de qualidade. Converse sobre o contexto antes de alterar o
            plano.
          </p>
        </details>
      </section>
    </div>
  );
}
