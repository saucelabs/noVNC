/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2018 The noVNC Authors
 * Licensed under MPL 2.0 or any later version (see LICENSE.txt)
 */

export class RingBuffer {
    constructor(size) {
        this._buf = [];
        this._index = 0;
        this._size = size;
    }

    get avg() {
        const sum = this._buf.reduce((a, b) => a + b, 0);
        return sum * 1.0 / this._buf.length;
    }

    push(value) {
        if (this._buf.length < this._size) {
            this._buf.push(value);
        } else {
            this._buf[this._index] = value;
            this._index = (this._index + 1) % this._buf.length;
        }
    }
}
