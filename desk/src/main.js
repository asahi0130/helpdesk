import { createApp, h } from "vue";
import {
  Badge,
  Button,
  Dialog,
  ErrorMessage,
  FeatherIcon,
  FormControl,
  frappeRequest,
  FrappeUI,
  Input,
  setConfig,
  TextInput,
  toast,
  Tooltip,
} from "frappe-ui";
import { createPinia } from "pinia";
import App from "./App.vue";
import { createDialog } from "./components/dialogs";
import "./index.css";
import { router } from "./router";
import { telemetryPlugin } from "frappe-ui/frappe";
import { isCustomerPortal } from "@/utils";
import { translationPlugin } from "./translation";
import CircleAlert from "~icons/lucide/circle-alert";
import { initSocket } from "./socket";

const globalComponents = {
  Badge,
  Button,
  Dialog,
  ErrorMessage,
  FeatherIcon,
  FormControl,
  Input,
  Tooltip,
  TextInput,
};

setConfig("resourceFetcher", frappeRequest);
setConfig("serverMessagesHandler", (msgs) => {
  if (isCustomerPortal.value) {
    return;
  }
  msgs.forEach((msg) => {
    msg = JSON.parse(msg);
    if (msg && msg.message == "Feedback email has been sent to the customer") {
      toast.success(msg.message);
      return;
    }
    toast.create({
      message: msg.message,
      icon: h(CircleAlert, { class: "text-blue-500" }),
    });
  });
});
setConfig("fallbackErrorHandler", (error) => {
  const msg = error.exc_type
    ? (error.messages || error.message || []).join(", ")
    : error.message;
  toast.error(msg);
});

const pinia = createPinia();
const app = createApp(App);

app.use(FrappeUI);
app.use(pinia);

for (const c in globalComponents) {
  app.component(c, globalComponents[c]);
}

app.config.globalProperties.$dialog = createDialog;

function bootstrapApp() {
  app.use(translationPlugin);
  app.use(telemetryPlugin, { app_name: "helpdesk" });
  app.use(router);

  const socket = initSocket();
  app.config.globalProperties.$socket = socket;
  app.mount("#app");
}

async function loadDevBootData() {
  const response = await fetch("/__helpdesk_boot", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to load boot data: ${response.status}`);
  }

  const html = await response.text();
  const matches = html.matchAll(
    /window\["([^"]+)"\]\s*=\s*([\s\S]*?);/g
  );

  for (const [, key, rawValue] of matches) {
    try {
      window[key] = JSON.parse(rawValue);
    } catch {
      // Ignore values that are not valid JSON literals.
    }
  }
}

if (import.meta.env.DEV) {
  loadDevBootData().then(() => {
    bootstrapApp();
  });
} else {
  bootstrapApp();
}
