#!/usr/bin/env bash

version=$(npm -v)
major_version=${version%.*.*}
if [ "$major_version" != "8" ]; then
    echo 'Please install packages with npm@8' >&2
    echo '' >&2
    exit 1
fi
