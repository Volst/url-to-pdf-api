#!/bin/bash

NODE_ENV=production now --docker -T volst --dotenv=.env.now
# TODO: add now alias and now scale