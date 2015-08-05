FROM ubuntu:14.04

# upgrade
RUN apt-get update
RUN apt-get upgrade -y

# needed packages
RUN apt-get install -y --no-install-recommends python-pip curl nginx-core
RUN pip install envtpl

# nginx
ADD nginx.conf.tpl /etc/nginx/nginx.conf.tpl

# kopf
ENV KOPF_VERSION 1.5.7
RUN curl -s -L "https://github.com/lmenezes/elasticsearch-kopf/archive/v${KOPF_VERSION}.tar.gz" | \
    tar xz -C /tmp && mv "/tmp/elasticsearch-kopf-${KOPF_VERSION}" /kopf

# run script
ADD ./run.sh ./run.sh

# logs
VOLUME ["/var/log/nginx"]

# ports
EXPOSE 80 443

ENTRYPOINT ["/run.sh"]
