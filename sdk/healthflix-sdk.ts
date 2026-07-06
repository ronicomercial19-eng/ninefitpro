/**
 * HealthFlix SDK — Cliente oficial TypeScript/JavaScript
 * Integração bidirecional FitPro ↔ HealthFlix
 * 
 * Uso:
 * const hf = new HealthFlixClient({ apiKey: "..." });
 * const { embed_url } = await hf.studentContext(...);
 */

export interface StudentContextRequest {
  fitpro_student_id: string;
  fitpro_professor_id?: string;
  role: "student" | "professor";
  view?: "home" | "library" | "workout";
  return_url?: string;
  email?: string;
  full_name?: string;
  permissions?: string[];
}

export interface StudentContextResponse {
  ok: boolean;
  embed_url: string;
  role: string;
  expires_at: string;
  error?: string;
}

export interface AssignContentRequest {
  fitpro_student_id: string;
  fitpro_professor_id: string;
  content_id: string;
  content_title?: string;
  content_category?: string;
  due_at?: string;
}

export interface AssignContentResponse {
  ok: boolean;
  assignment_id: string;
  error?: string;
}

export interface SyncUsersRequest {
  users: Array<{
    fitpro_user_id: string;
    role: "student" | "professor";
    email: string;
    full_name?: string;
    professor_fitpro_id?: string;
  }>;
}

export interface SyncUsersResponse {
  ok: boolean;
  synced: number;
  error?: string;
}

export interface StudentProgressResponse {
  ok: boolean;
  progress: Array<{
    content_id: string;
    progress_percent: number;
    completed_at?: string;
  }>;
  error?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  category: string;
  level: string;
  duration: string;
  thumbnail: string;
  video_url: string;
}

export interface ContentListResponse {
  ok: boolean;
  total: number;
  items: ContentItem[];
  error?: string;
}

export interface HealthFlixEvent {
  event_type: string;
  fitpro_student_id: string;
  fitpro_professor_id?: string;
  entity_type: string;
  entity_id: string;
  payload?: Record<string, any>;
}

export class HealthFlixError extends Error {
  constructor(
    public code: "AUTH" | "BAD_REQUEST" | "UNAVAILABLE" | "NETWORK" | "UNKNOWN",
    public userMessage: string,
    message: string
  ) {
    super(message);
    this.name = "HealthFlixError";
  }
}

interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  supabaseAnonKey?: string;
}

export class HealthFlixClient {
  private apiKey: string;
  private baseUrl: string;
  private supabaseAnonKey: string;
  private retryConfig = {
    maxAttempts: 4,
    initialDelay: 500, // ms
  };

  constructor(config: ClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl =
      config.baseUrl || "https://kixjiwsfogqztlgiiztp.supabase.co/functions/v1";
    this.supabaseAnonKey =
      config.supabaseAnonKey ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeGpmd3Nmb2dxenRsZ2lpenRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MDIwMDAsImV4cCI6MTg5MzQ2ODAwMH0.DummyAnonKeyForProduction";
  }

  /**
   * Gera deep-link assinado para abrir catálogo HealthFlix
   * ★ Loop principal: Train → Streaming → embed_url
   */
  async studentContext(
    req: StudentContextRequest
  ): Promise<StudentContextResponse> {
    return this.requestWithRetry(
      "POST",
      "/fitpro-student-context",
      req,
      {
        code: "UNKNOWN",
        userMessage: "Falha ao gerar link de acesso ao catálogo.",
      }
    );
  }

  /**
   * Sincroniza alunos/professores do FitPro em massa
   */
  async syncUsers(users: SyncUsersRequest["users"]): Promise<SyncUsersResponse> {
    return this.requestWithRetry(
      "POST",
      "/fitpro-sync",
      { users },
      {
        code: "BAD_REQUEST",
        userMessage: "Erro ao sincronizar usuários com o catálogo.",
      }
    );
  }

  /**
   * Atribui um conteúdo a um aluno (professor)
   */
  async assignContent(
    req: AssignContentRequest
  ): Promise<AssignContentResponse> {
    return this.requestWithRetry(
      "POST",
      "/fitpro-content-assign",
      req,
      {
        code: "BAD_REQUEST",
        userMessage: "Erro ao atribuir conteúdo ao aluno.",
      }
    );
  }

  /**
   * Consulta progresso do aluno
   */
  async studentProgress(
    fitpro_student_id: string
  ): Promise<StudentProgressResponse> {
    return this.requestWithRetry(
      "GET",
      `/fitpro-student-progress?fitpro_student_id=${fitpro_student_id}`,
      null,
      {
        code: "UNKNOWN",
        userMessage: "Falha ao carregar progresso do aluno.",
      }
    );
  }

  /**
   * Lista catálogo de conteúdo
   */
  async getContent(): Promise<ContentListResponse> {
    return this.requestWithRetry(
      "GET",
      "/fitpro-content",
      null,
      {
        code: "UNAVAILABLE",
        userMessage: "Catálogo temporariamente indisponível.",
      }
    );
  }

  /**
   * Envia evento para HealthFlix (bidirecional)
   */
  async sendEvent(event: HealthFlixEvent): Promise<{ ok: boolean }> {
    return this.requestWithRetry(
      "POST",
      "/fitpro-events",
      event,
      {
        code: "UNKNOWN",
        userMessage: "Erro ao registrar evento no catálogo.",
      }
    );
  }

  /**
   * Healthcheck
   */
  async health() {
    return this.fetch("GET", "/fitpro-health", null, false);
  }

  private async requestWithRetry(
    method: "GET" | "POST",
    path: string,
    body: any,
    fallbackError: { code: string; userMessage: string }
  ): Promise<any> {
    let lastError: HealthFlixError | null = null;

    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        return await this.fetch(method, path, body, true);
      } catch (err) {
        if (err instanceof HealthFlixError) {
          // Não retry em AUTH ou BAD_REQUEST
          if (err.code === "AUTH" || err.code === "BAD_REQUEST") {
            throw err;
          }
          lastError = err;

          // Retry exponencial
          if (attempt < this.retryConfig.maxAttempts - 1) {
            const delay =
              this.retryConfig.initialDelay * Math.pow(2, attempt);
            await new Promise((res) => setTimeout(res, delay));
          }
        } else {
          throw err;
        }
      }
    }

    throw (
      lastError ||
      new HealthFlixError(
        fallbackError.code as any,
        fallbackError.userMessage,
        "Max retries exceeded"
      )
    );
  }

  private async fetch(
    method: "GET" | "POST",
    path: string,
    body: any,
    requireAuth: boolean
  ): Promise<any> {
    const url = this.baseUrl + path;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: this.supabaseAnonKey,
    };

    if (requireAuth) {
      headers["x-api-key"] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMsg = errorBody.error || response.statusText;

        if (response.status === 401) {
          throw new HealthFlixError(
            "AUTH",
            "Conexão com a HealthFlix expirou. Avise o administrador.",
            errorMsg
          );
        } else if (response.status === 400) {
          throw new HealthFlixError(
            "BAD_REQUEST",
            "Dados incompletos para abrir o catálogo.",
            errorMsg
          );
        } else if (response.status >= 500) {
          throw new HealthFlixError(
            "UNAVAILABLE",
            "HealthFlix temporariamente indisponível. Tentando novamente...",
            errorMsg
          );
        } else {
          throw new HealthFlixError(
            "UNKNOWN",
            "Erro desconhecido com o catálogo.",
            errorMsg
          );
        }
      }

      return await response.json();
    } catch (err) {
      if (err instanceof HealthFlixError) {
        throw err;
      }
      throw new HealthFlixError(
        "NETWORK",
        "Sem conexão. Verifique sua internet.",
        String(err)
      );
    }
  }
}
