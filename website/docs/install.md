---
sidebar_position: 2
title: Install the extension
---

# Install the extension

The extension adds a **{ } Text Code** button to the Scratch editor (scratch.mit.edu and turbowarp.org).

![The Text Code button in Scratch's menu bar](/img/guide/scratch-with-button.jpg)

## Chrome, Edge, Brave and other Chromium browsers

<span className="step">1</span> Download **[texttoscratch-extension.zip](pathname:///downloads/texttoscratch-extension.zip)** and unzip it.

<span className="step">2</span> Open `chrome://extensions` and switch on **Developer mode** (top right).

<span className="step">3</span> Click **Load unpacked** and choose the unzipped folder (the one containing `manifest.json`).

<span className="step">4</span> Open any project in the Scratch editor. **{ } Text Code** appears in the purple menu bar.

## Firefox

Unzip the same download, open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, and pick its `manifest.json`.
Firefox removes temporary add-ons when it restarts.

## No install? Use the web editor

The **[web editor](pathname:///editor/)** is the same editor as a plain web page.
Click **Open .sb3**, code, then **Download .sb3** and load the file into Scratch with **File → Load from your computer**.

:::tip Where is my code saved?
Your source files are stored **inside the Scratch project** (in a collapsed Stage comment).
Saving the project in Scratch saves your code too, and opening it again brings the code back.
:::
