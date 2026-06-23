import ReactDOM from "react-dom/client";
import { client, SigmaClientProvider } from "@sigmacomputing/plugin";
import SaudiApp from "./SaudiApp";
import { configureEditorPanel } from "./lib/sigmaConfig";
import "./styles.css";

// Register the editor-panel controls with Sigma before rendering.
configureEditorPanel();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SigmaClientProvider client={client}>
    <SaudiApp />
  </SigmaClientProvider>,
);
