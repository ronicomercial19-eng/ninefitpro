import { useNavigate } from "react-router-dom";
import { usePrimeOffer } from "@/hooks/usePrimeOffer";

interface UpgradeLinkProps {
  className?: string;
  children: React.ReactNode;
  category?: string;
  /** Conteúdo alternativo enquanto carrega. Por padrão mantém children. */
  loadingLabel?: string;
}

/**
 * Botão de upgrade que usa a oferta ativa cadastrada em monetization_offers.
 * Sem oferta ativa, o botão fica desabilitado em vez de apontar para um
 * checkout de teste fixo.
 */
export function UpgradeLink({ className, children, category = "prime", loadingLabel }: UpgradeLinkProps) {
  const navigate = useNavigate();
  const { href, isExternal, status } = usePrimeOffer(category);

  if (status === "loading") {
    return (
      <button type="button" disabled className={`${className ?? ""} opacity-60 cursor-wait`}>
        {loadingLabel ?? children}
      </button>
    );
  }

  if (!href) {
    return (
      <button
        type="button"
        disabled
        title="Nenhuma oferta disponível no momento"
        className={`${className ?? ""} opacity-50 cursor-not-allowed`}
      >
        {children}
      </button>
    );
  }

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={() => navigate(href)} className={className}>
      {children}
    </button>
  );
}
