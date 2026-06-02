FROM node:22-alpine

ARG GENIEACS_VERSION=1.2.16

RUN apk add --no-cache tini wget \
  && npm install -g "genieacs@${GENIEACS_VERSION}" \
  && addgroup -S genieacs \
  && adduser -S -G genieacs genieacs \
  && mkdir -p /opt/genieacs/ext /var/log/genieacs \
  && chown -R genieacs:genieacs /opt/genieacs /var/log/genieacs

COPY entrypoint.sh /usr/local/bin/freeacs-entrypoint

RUN chmod 755 /usr/local/bin/freeacs-entrypoint

USER genieacs

EXPOSE 7547 7557 7567 3000

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/freeacs-entrypoint"]

