#!/bin/sh

cd $( dirname $0 )

npm install
grunt clean copy concat
