import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { hasError: boolean; errorId: string; }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorId: "" };

  static getDerivedStateFromError(): State {
    return { hasError: true, errorId: crypto.randomUUID() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private recover = () => {
    this.setState({ hasError: false, errorId: "" });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <section className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-xl font-bold">Ocorreu um erro inesperado</h1>
          <p className="text-sm text-muted-foreground">
            A tela não conseguiu carregar. Tente novamente; seus dados persistidos não serão apagados.
          </p>
          <p className="text-xs text-muted-foreground">Código: {this.state.errorId}</p>
          <Button onClick={this.recover} className="w-full">Tentar novamente</Button>
        </section>
      </main>
    );
  }
}
