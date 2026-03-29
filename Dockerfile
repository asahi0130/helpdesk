FROM ghcr.io/frappe/helpdesk:stable

USER root
RUN apt-get update && apt-get install -y curl ca-certificates gnupg && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get update && apt-get install -y nodejs && npm install -g yarn && rm -rf /var/lib/apt/lists/*

USER frappe
WORKDIR /home/frappe/frappe-bench

RUN rm -rf /home/frappe/frappe-bench/apps/helpdesk
COPY --chown=frappe:frappe . /home/frappe/frappe-bench/apps/helpdesk

RUN cd /home/frappe/frappe-bench/apps/helpdesk && yarn install
RUN python -m pip install --user -e /home/frappe/frappe-bench/apps/helpdesk
RUN cd /home/frappe/frappe-bench && bench build --app helpdesk
