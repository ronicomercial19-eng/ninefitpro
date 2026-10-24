import { ExternalLink, Users } from "lucide-react";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";
const COMMUNITY_URL = "https://ninefit-community-flow.lovable.app";
export default function CommunityAdminPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold flex gap-2">
        <Users />
        Comunidade 9FIT
      </h1>
      <p>
        A gestão de tribos e interações acontece no módulo Comunidade. Ele abre
        em outra aba; este painel permanece aberto para continuar o
        acompanhamento do aluno.
      </p>
      <a
        href={COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex gap-2 text-primary underline"
      >
        <ExternalLink />
        Abrir gestão da Comunidade
      </a>
      <ApiConnectorCard
        moduleKey="community"
        title="Comunidade API"
        description="Configuração da integração. Uma chave cadastrada não importa automaticamente tribos ou interações para este painel."
      />
      <p className="text-sm text-muted-foreground">
        As permissões e o login são validados pelo módulo externo. Dados de
        acesso do FitPro não são enviados pela URL.
      </p>
    </div>
  );
}
