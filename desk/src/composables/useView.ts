import { useAuthStore } from "@/stores/auth";
import { View } from "@/types";
import { getIcon, isCustomerPortal } from "@/utils";
import { call, createListResource, createResource } from "frappe-ui";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

export const views = createListResource({
  doctype: "HD View",
  fields: ["*"],
  transform: (data: any) => {
    data.forEach((view: View) => {
      view.filters = JSON.parse(view.filters) || {};
      view.columns = JSON.parse(view.columns) || [];
      view.rows = JSON.parse(view.rows) || [];
    });
  },
  pageLength: 1000,
});

export const currentView = ref({
  label: "List",
  icon: LucideAlignJustify,
});

export const publicTicketViewCounts = ref<Record<string, number>>({});

let publicTicketViewCountKey = "";
let publicTicketViewCountsFetched = false;
let publicTicketViewCountPromise: Promise<Record<string, number>> | null = null;

export async function loadPublicTicketViewCounts(force = false) {
  if (isCustomerPortal.value) {
    publicTicketViewCountKey = "";
    publicTicketViewCountsFetched = false;
    publicTicketViewCounts.value = {};
    return publicTicketViewCounts.value;
  }

  const ticketViews =
    views.data?.filter((view: View) => view.public && view.dt === "HD Ticket") || [];
  const key = JSON.stringify(
    ticketViews.map((view: View) => ({
      name: view.name,
      filters: view.filters || {},
    }))
  );

  if (!force && publicTicketViewCountKey === key && publicTicketViewCountsFetched) {
    return publicTicketViewCounts.value;
  }

  publicTicketViewCountKey = key;

  if (!ticketViews.length) {
    publicTicketViewCountsFetched = true;
    publicTicketViewCounts.value = {};
    return publicTicketViewCounts.value;
  }

  if (!force && publicTicketViewCountPromise) {
    return publicTicketViewCountPromise;
  }

  publicTicketViewCountPromise = Promise.all(
    ticketViews.map(async (view: View) => {
      const response = await call("helpdesk.api.doc.get_list_data", {
        doctype: "HD Ticket",
        filters: view.filters || {},
        page_length: 1,
        columns: [],
        rows: [],
        show_customer_portal_fields: false,
        is_default: false,
      });

      return [view.name, response?.total_count ?? 0] as const;
    })
  )
    .then((counts) => {
      publicTicketViewCountsFetched = true;
      publicTicketViewCounts.value = Object.fromEntries(counts);
      return publicTicketViewCounts.value;
    })
    .catch(() => {
      publicTicketViewCountsFetched = false;
      publicTicketViewCounts.value = {};
      return publicTicketViewCounts.value;
    })
    .finally(() => {
      publicTicketViewCountPromise = null;
    });

  return publicTicketViewCountPromise;
}

export function useView(dt: string = null) {
  const auth = useAuthStore();
  const router = useRouter();

  function callGetViews() {
    if (
      (views.filters?.dt === dt && views.data?.length > 0) ||
      views.list?.promise
      // views.isCustomerPortal === isCustomerPortal.value
    ) {
      return;
    }
    const filters = {
      is_customer_portal: isCustomerPortal.value,
    };
    if (dt) {
      filters["dt"] = dt;
    }
    if (isCustomerPortal.value) {
      filters["user"] = auth.userId;
    }
    views.isCustomerPortal = isCustomerPortal.value;
    views.update({ filters });
    views.fetch();
  }
  callGetViews();
  loadPublicTicketViewCounts();

  const getCurrentUserViews = computed(() =>
    views.data
      ?.filter(
        (view: View) =>
          !view.is_default &&
          view.user === auth.userId &&
          !view.public &&
          !view.pinned
      )
      .map(parseView)
  );

  async function createView(
    view: View,
    successCB: Function = () => {},
    errorCB: Function = () => {}
  ) {
    createResource({
      url: "frappe.client.insert",
      params: {
        doc: {
          doctype: "HD View",
          ...view,
          user: auth.userId,
        },
      },
      auto: true,
      onSuccess: (d) => {
        views.reload().then(() => {
          successCB(d);
        });
      },
      onError: (e) => {
        console.log("error", e);
        errorCB(e);
      },
    });
  }

  function findView(viewName: string) {
    return computed(() => views.data?.find((v: View) => v.name === viewName));
  }

  const pinnedViews = computed(() =>
    views.data
      ?.filter((view: View) => view.pinned && view.user === auth.userId)
      .map(parseView)
  );

  const publicViews = computed(() =>
    views.data
      ?.filter((view: View) => view.public)
      .map((view: View) =>
        parseView({
          ...view,
          count:
            view.dt === "HD Ticket"
              ? publicTicketViewCounts.value?.[view.name] ?? 0
              : undefined,
        })
      )
  );

  const defaultView = computed(() =>
    views.data?.find(
      (v: View) => v.is_default && v.user === auth.userId && v.dt === dt
    )
  );

  function updateView(view: any, successCB: Function = () => {}) {
    if (view.name !== "default") {
      // handle custom view
      call("frappe.client.set_value", {
        doctype: "HD View",
        name: view.name,
        fieldname: view,
      }).then(() => {
        successCB();
        views.reload();
      });
    } else {
      // handle default view
      createOrUpdateDefaultView(view);
      successCB();
    }
  }

  function deleteView(viewName: string) {
    call("frappe.client.delete", {
      doctype: "HD View",
      name: viewName,
    }).then(() => {
      views.reload();
    });
  }

  function createOrUpdateDefaultView(view: View) {
    const defaultView = views.data?.find(
      (v: View) => v.is_default && v.user === auth.userId && v.dt === view.dt
    );
    view.is_customer_portal = isCustomerPortal.value;
    if (defaultView) {
      delete view["name"];

      call("frappe.client.set_value", {
        doctype: "HD View",
        name: defaultView.name,
        fieldname: {
          ...view,
        },
      }).then(() => {
        views.reload();
      });
    } else {
      view["doctype"] = "HD View";
      // create default view
      createView({
        ...view,
        is_default: true,
      });
    }
  }

  function parseView(view: View) {
    return {
      label: view.label,
      name: view.name,
      icon: getIcon(view.icon),
      count: view.count,
      route_name: view.route_name,
      onClick: () => {
        router.push({
          name: view.route_name,
          query: {
            view: view.name,
          },
        });
      },
    };
  }

  watch(
    () => isCustomerPortal.value,
    (newVal) => {
      views.isCustomerPortal = newVal;
      callGetViews();
    }
  );

  watch(
    () =>
      views.data
        ?.filter((view: View) => view.public && view.dt === "HD Ticket")
        .map((view: View) => JSON.stringify([view.name, view.filters || {}]))
        .join("|"),
    () => loadPublicTicketViewCounts(true)
  );

  return {
    views,
    getCurrentUserViews,
    pinnedViews,
    publicViews,
    publicTicketViewCounts,
    loadPublicTicketViewCounts,
    defaultView,
    findView,
    createView,
    updateView,
    deleteView,
    createOrUpdateDefaultView,
  };
}
