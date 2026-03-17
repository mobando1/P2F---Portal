import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleGoToLogin = () => {
    // Clear all session data and redirect to login
    localStorage.removeItem("passport2fluency_user");
    window.location.href = "/login";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <h1 className="text-2xl font-bold mb-2 text-[#0A4A6E]">
            Algo salió mal
          </h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Hubo un problema inesperado. Intenta recargar la página o iniciar sesión de nuevo.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleReload} variant="outline">
              Recargar página
            </Button>
            <Button onClick={this.handleGoToLogin} className="bg-[#1C7BB1] hover:bg-[#0A4A6E] text-white">
              Ir a iniciar sesión
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
