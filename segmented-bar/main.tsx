import ReactDOM from "react-dom/client";
import { client, SigmaClientProvider } from "@sigmacomputing/plugin";
import App from "./App";
import { configureEditorPanel } from "./sigmaConfig";
import "./styles.css";

// Register the editor-panel controls with Sigma before rendering.
configureEditorPanel();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SigmaClientProvider client={client}>
    <App />
  </SigmaClientProvider>,
);
