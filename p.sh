#!/bin/bash

cmd="$@"
echo $cmd
ssh ${SERVER} "$cmd"
