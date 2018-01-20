#!/bin/bash

# set -x # debug on
docker run -i --rm --cap-add=SYS_ADMIN \
  --name puppeteer-chrome puppeteer-chrome-linux
# set +x # debug off