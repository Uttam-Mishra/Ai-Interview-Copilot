import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

const root = ReactDOM.createRoot(rootElement);

function CrashScreen({ message }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background:
          "linear-gradient(145deg, #07101a 0%, #122033 48%, #09121d 100%)",
        color: "#f5efe4",
        fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "1.5rem",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          background: "rgba(10, 18, 28, 0.82)",
        }}
      >
        <p style={{ margin: 0, color: "#f1a55f", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Frontend Error
        </p>
        <h1 style={{ margin: "0.75rem 0 0", fontSize: "2rem" }}>
          The UI failed to load.
        </h1>
        <p style={{ margin: "0.75rem 0 0", color: "#c8d3df" }}>
          Restart the frontend dev server and check this message. If it stays, send
          this exact error.
        </p>
        <pre
          style={{
            margin: "1rem 0 0",
            padding: "1rem",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.04)",
            color: "#ffb1b1",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message}
        </pre>
      </div>
    </main>
  );
}

function formatErrorMessage(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function renderCrash(error) {
  const message =
    formatErrorMessage(error);

  root.render(<CrashScreen message={message} />);
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    };
  }

  componentDidCatch(error) {
    console.error("App render failed:", error);
  }

  render() {
    if (this.state.error) {
      return <CrashScreen message={formatErrorMessage(this.state.error)} />;
    }

    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  if (event.error) {
    renderCrash(event.error);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  renderCrash(event.reason);
});

root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
