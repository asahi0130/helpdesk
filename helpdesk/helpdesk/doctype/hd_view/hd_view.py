# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from helpdesk.api.dashboard import COUNT_NAME
from helpdesk.api.doc import handle_at_me_support
from helpdesk.utils import agent_only


class HDView(Document):
    def validate(self):
        self.validate_default_view()

    def validate_default_view(self):
        if not self.is_default:
            return

        default_view_exists = frappe.db.exists(
            "HD View",
            {
                "is_default": 1,
                "name": ("!=", self.name),
                "user": frappe.session.user,
                "dt": self.dt,
            },
        )

        if default_view_exists:
            frappe.throw(
                _("Only one default view is allowed per user for {0}").format(self.dt)
            )

    def before_save(self):
        self.toggle_pinned_public_view()

    def toggle_pinned_public_view(self):
        if self.pinned and self.public:
            if self.has_value_changed("pinned"):
                self.public = 0
            if self.has_value_changed("public"):
                self.pinned = 0


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
