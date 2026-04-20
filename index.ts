name: Build Windows Installer

on:
  workflow_dispatch:

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm install

      - name: Build installer
        run: npm run dist:win

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: tyvok-studio-windows
          path: |
            dist/*.exe
            dist/*.yml
            dist/*.blockmap
