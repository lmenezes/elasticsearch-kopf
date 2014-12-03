#!/bin/sh

set -e

envtpl /etc/nginx/nginx.conf.tpl

if [ ! -z "${KOPF_BASIC_AUTH_LOGIN}" ]; then
    echo "${KOPF_BASIC_AUTH_LOGIN}:${KOPF_BASIC_AUTH_PASSWORD}" > /etc/nginx/kopf.htpasswd
fi

echo '{"elasticsearch_root_path": "/es"}' > /kopf/kopf_external_settings.json

exec nginx
