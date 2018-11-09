#!/bin/bash
set -ev

rm -fv CNAME
cp -fv scripts/_config.yml ./_config.yml

jekyll build --destination out/