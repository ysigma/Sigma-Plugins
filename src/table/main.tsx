import ReactDOM from "react-dom/client";
import { client, SigmaClientProvider } from "@sigmacomputing/plugin";
import App from "./App";
import { configureEditorPanel } from "./lib/sigmaConfig";
import "./styles.css";

configureEditorPanel();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SigmaClientProvider client={client}>
    <App />
  </SigmaClientProvider>,
);
