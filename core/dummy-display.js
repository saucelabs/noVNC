/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2018 The noVNC Authors
 * Licensed under MPL 2.0 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */
export default class DummyDisplay {
    get width() {
        return 0;
    }

    get height() {
        return 0;
    }

    // ===== PUBLIC METHODS =====

    viewportChangePos() {}

    viewportChangeSize() {}

    absX(x) {
        return 0;
    }

    absY(y) {
        return 0;
    }

    resize() {}

    flip() {}

    copyImage() {}

    imageRect() {}

    startTile() {}

    subTile() {}

    finishTile() {}

    blitImage() {}

    blitRgbImage() {}

    blitRgbxImage() {}

    drawImage() {}

    drawVideoFrame() {}

    autoscale() {}
}
