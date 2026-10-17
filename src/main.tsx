import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

// StrictMode intentionally omitted: its double-effect invocation in dev
// creates and immediately kills PTY sessions, breaking the terminal.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);
