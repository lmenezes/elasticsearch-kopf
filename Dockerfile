FROM node:8-alpine as build

ADD . /build

RUN cd /build && \
    npm install && \
    ./node_modules/grunt-cli/bin/grunt clean copy concat

FROM alpine:latest

RUN apk add --no-cache --update lighttpd

ADD docker/lighttpd.conf /etc/lighttpd/lighttpd.conf
COPY --from=build /build/_site /var/www/localhost/htdocs/

CMD lighttpd -D -f /etc/lighttpd/lighttpd.conf
