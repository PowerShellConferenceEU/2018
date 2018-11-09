#!/bin/bash
set -ev

# clear and re-create the out directory
rm -rf out || exit 0;
mkdir out;

# run the build script
./scripts/build.sh

# go to the out directory and create a new git repo
cd out
git init

# create travis user
git config user.name "Travis CI"
git config user.email "admin@psconf.eu"

# add files and commit
git add .
git commit -m "Deploy to DEV"

# force push to dev repo
git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:gh-pages > /dev/null 2>&1