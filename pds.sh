#!/bin/bash

cmd="$@"
echo "docker service $cmd"
ssh ${SERVER} "docker service $cmd"
