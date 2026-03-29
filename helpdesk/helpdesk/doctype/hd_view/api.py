import frappe

from helpdesk.api.dashboard import COUNT_NAME
from helpdesk.api.doc import handle_at_me_support
from helpdesk.utils import agent_only


@frappe.whitelist()
@agent_only
def get_ticket_view_counts(view_names: list[str] | str | None = None) -> dict[str, int]:
    view_names = frappe.parse_json(view_names) or []
    if not view_names:
        return {}

    views = frappe.get_list(
        "HD View",
        fields=["name", "filters"],
        filters={
            "name": ["in", view_names],
            "dt": "HD Ticket",
            "public": 1,
            "is_customer_portal": 0,
        },
        page_length=len(view_names),
    )

    counts = {}
    for view in views:
        filters = frappe.parse_json(view.filters or "{}") or {}
        handle_at_me_support(filters)
        count = frappe.get_list(
            "HD Ticket",
            fields=[COUNT_NAME],
            filters=filters,
            page_length=1,
        )[0].get("count", 0)
        counts[view.name] = count

    return counts
