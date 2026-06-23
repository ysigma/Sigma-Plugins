import ReactDOM from "react-dom/client";
import { client, SigmaClientProvider } from "@sigmacomputing/plugin";
import ApdexApp from "./ApdexApp";
import { configureEditorPanel } from "./sigmaConfig";

// Register the editor-panel controls with Sigma before rendering.
configureEditorPanel();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SigmaClientProvider client={client}>
    <ApdexApp />
  </SigmaClientProvider>,
);
