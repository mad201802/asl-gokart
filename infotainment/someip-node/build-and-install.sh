#!/bin/bash
# Script to rebuild the someip-node module and install it in the headunit app

echo "Building someip-node module..."
yarn build

echo "Installing someip-node in headunit app..."
cd ../headunit && npm install ../someip-node

echo "Done!"
