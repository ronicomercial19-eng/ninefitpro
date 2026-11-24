import { Link } from "react-router-dom";
import "./home-access-lines.css";

export function HomeAccessLines({
  onNutrition,
  planLabel,
}: {
  onNutrition: () => void;
  planLabel: string;
}) {
  const items = [
    {
      key: "train",
      label: "Treino",
      name: "Meu treino",
      emoji: "🏋️",
      to: "/9fit/train",
      hint: planLabel,
    },
    {
      key: "nutrition",
      label: "Nutrição",
      name: "Alimentação e água",
      emoji: "🥗",
      action: onNutrition,
      hint: "Consultar alimentação e registrar água",
    },
    {
      key: "progress",
      label: "Evolução",
      name: "Minha evolução",
      emoji: "📈",
      to: "/9fit/progresso",
      hint: "Consultar medidas, metas e histórico",
    },
    {
      key: "ron",
      label: "RON",
      name: "Conversar com RON",
      emoji: "🧠",
      to: "/9fit/ron?context=hub_command",
      hint: "Conversar com o assistente",
    },
    {
      key: "hub",
      label: "Hub",
      name: "Registrar no Hub",
      emoji: "🌊",
      to: "/9fit/hub",
      hint: "Registrar a rotina e abrir os gráficos",
    },
  ];
  return (
    <nav className="home-access-lines" aria-label="Acessos do Início">
      {items.map((item) => {
        const content = (
          <>
            <span className="home-access-line" aria-hidden="true">
              <span />
            </span>
            <span className="home-access-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="home-access-label">{item.label}</span>
          </>
        );
        const props = {
          className: "home-access-item",
          "data-tone": item.key,
          "aria-label": item.name,
          title: item.hint,
        };
        return item.to ? (
          <Link key={item.key} to={item.to} {...props}>
            {content}
          </Link>
        ) : (
          <button key={item.key} type="button" onClick={item.action} {...props}>
            {content}
          </button>
        );
      })}
    </nav>
  );
}
