import { useTelemetry } from "frappe-ui/frappe";
const APP = "helpdesk";
const POSTHOG_PATH = "../../../frappe/frappe/public/js/lib/posthog.js";

let attemptedPosthogLoad = false;

function loadPosthog() {
  if (attemptedPosthogLoad) return;
  attemptedPosthogLoad = true;

  import(/* @vite-ignore */ POSTHOG_PATH).catch(() => {
    // Optional in standalone builds where frappe source isn't mounted.
  });
}

interface CaptureOptions {
  data: {
    [key: string]: string | number | boolean | object;
  };
}

export function capture(event: string, options: CaptureOptions = { data: {} }) {
  loadPosthog();
  const { capture: _capture } = useTelemetry();
  _capture(event, options.data);
}
