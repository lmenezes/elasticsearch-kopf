# Kopf in docker

Tagged docker images for kopf, `lmenezes/kopf` on docker hub.

## Usage

Use `docker run` as you always do. You need to publish port `80`
(and `443` if you use ssl) in order to have access to kopf.

Container should have access to elasticsearch. You don't
need to expose elasticsearch to end users of kopf.

It is strongly recommended to use https and basic auth
if you don't want to get hacked.

### Env variables.

* `KOPF_SERVER_NAME` server name for your grafana, for example `kopf.example.com`
* `KOPF_ES_SERVERS` elasticsearch servers in `host:port[,host:port]` format
* `KOPF_SSL_CERT` path to ssl `.crt` file, enables http-to-https redirect, should be bind-mounted
* `KOPF_SSL_KEY` path to ssl `.key` file, should be bind-mounted
* `KOPF_BASIC_AUTH_LOGIN` basic auth login, if needed
* `KOPF_BASIC_AUTH_PASSWORD` hashed basic auth password, if needed
* `KOPF_NGINX_INCLUDE_FILE` file to include into main server of nginx (place allowed ips here)

### Example

Running kopf with elasticsearch on `es.dev:9200`,
exposing it on `kopf.dev` with ip address `10.10.10.10`:

```
docker run -d -p 10.10.10.10:80:80 -e KOPF_SERVER_NAME=grafana.dev \
    -e KOPF_ES_SERVERS=es.dev:9200 --name kopf lmenezes/kopf
```
