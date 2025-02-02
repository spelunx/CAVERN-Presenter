# CAVERN Presenter

This is a single, standalone html page to render presentations for the CAVERN.
The CAVERN currently uses frame packing for 3D, which means the top half of the screen renders to one eye,
and the bottom half renders to the other eye. Drag and drop a pdf presentation onto this website and click "present" to show it in the middle of the CAVERN.

Use left arrow / up arrow to go back a slide, and right arrow / space / enter to go to the next slide.

This uses pdf.js to render the presentation, and jspdf to create a new downloadable pdf.

## Install
Using npm, run `npm install`

Using bun, run `bun install`

## Dev
Using npm, run `npm start`

Using bun, run `bun start`

## Build
Using npm, run `npm run build`

Using bun, run `bun run build`

The output is found in `build/index.html`
