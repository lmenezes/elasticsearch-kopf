#!/bin/sh

set -e

envtpl --keep-template /etc/nginx/nginx.conf.tpl

if [ ! -z "${KOPF_BASIC_AUTH_LOGIN}" ]; then
    echo "${KOPF_BASIC_AUTH_LOGIN}:${KOPF_BASIC_AUTH_PASSWORD}" > /etc/nginx/kopf.htpasswd
fi

KOPF_REFRESH_RATE="${KOPF_REFRESH_RATE:-5000}"
KOPF_THEME="${KOPF_THEME:-dark}"
KOPF_WITH_CREDENTIALS="${KOPF_WITH_CREDENTIALS:-false}"
KOPF_ES_ROOT_PATH="${KOPF_ES_ROOT_PATH:-/es}"

cat <<EOF > /kopf/_site/kopf_external_settings.json
{
    "elasticsearch_root_path": "${KOPF_ES_ROOT_PATH}",
    "with_credentials": ${KOPF_WITH_CREDENTIALS},
    "theme": "${KOPF_THEME}",
    "refresh_rate": ${KOPF_REFRESH_RATE}
}
EOF

exec nginx
