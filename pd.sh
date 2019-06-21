#!/bin/bash

cmd="$@"
echo "docker $cmd"
ssh ${SERVER} "docker $cmd"
