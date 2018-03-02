#!/bin/sh

docker run -it -v $(pwd):/build gorillastack/alpine-grunt-node /build/build.sh
