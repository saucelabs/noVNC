/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2012 Joel Martin
 * Copyright (C) 2015 Samuel Mannehed for Cendio AB
 * Licensed under MPL 2.0 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */

/* jslint white: false, browser: true */
/* global window, $D, Util, WebUtil, RFB, Display */

(function () {
    "use strict";

    // Load supporting scripts
    var _scriptsLoaded = false;
    var _scriptsLoadedCallbacks = [];

    function onNoVNCScriptsLoad() {
        _scriptsLoaded = true;

        while (_scriptsLoadedCallbacks.length > 0) {
            var cb = _scriptsLoadedCallbacks.shift();
            if (typeof cb === 'function') {
                cb();
            }
        }
    }

    Util.load_scripts(["webutil.js", "base64.js", "websock.js", "des.js",
                       "keysymdef.js", "keyboard.js", "input.js", "display.js",
                       "rfb.js", "keysym.js", "inflator.js"], onNoVNCScriptsLoad);

    function UI() {
        this.rfb_state = null;
        this.rfb = null;
        this.isTouchDevice = false;  // 'ontouchstart' in document.documentElement;
        /** @type {Number} connection retries counter */
        this.timesRetried = 0;
        /** @type {Boolean} true if `onFailedState()` was called */
        this.hasAlerted = false;
        /** @type {Object=} all custom options */
        this.options = null;
    }

    UI.prototype.load = function load(options) {
        this.options = Util.extend({
            encrypt: (window.location.protocol === "https:"),
            trueColor: true,
            cursor: false,
            shared: true,
            viewOnly: false,
            path: 'websockify',
            canvasId: null,
            canvasContainerId: null,
            focusId: null,
            clipboardSendId: null,
            clipboardReciveId: null,
            onNormalState: Util.noop,
            onFailedState: Util.noop,
            onClipReceive: Util.noop,
            onDisconnected: Util.noop,
            onLoaded: Util.noop,
            retries: 0,
            autoConnect: false,
            disconnectTimeout: 3,
            fallbackPorts: [],
            wsProtocols: ['binary'] // 'base64', 'binary'
        }, options);

        if (typeof this.timesRetried === 'undefined') {
            this.timesRetried = 0;
            this.hasAlerted = false;
        }

        if (this.options.autoConnect) {
            var ac = this.options.autoConnect;
            this.connect(ac.host, ac.port, ac.pass, ac.handshake);
        }

        if (this.isTouchDevice) {
            this.setMouseButton();
        }

        this.setViewClip();
    };

    UI.prototype.connect = function connect(host, port, password, sauce_handshake) {
        if (!this._initRFB()) return;

        this.rfb.set_encrypt(this.options.encrypt);
        this.rfb.set_true_color(this.options.trueColor);
        this.rfb.set_local_cursor(this.options.cursor);
        this.rfb.set_shared(this.options.shared);
        this.rfb.set_view_only(this.options.view_only);

        this.rfb.connect(host, port, password, '', sauce_handshake);
    };

    UI.prototype._initRFB = function _initRFB() {
        var self = this;

        try {
            this.rfb = new RFB({
                'target': $D(this.options.canvasId),
                'focusContainer': $D(this.options.focusId),
                'onUpdateState': function onUpdateState() { self.updateState.apply(self, arguments); },
                'onClipboard': function onClipboard() { self.onClipReceive.apply(self, arguments); },
                'disconnectTimeout': this.options.disconnectTimeout,
                'view_only': this.options.viewOnly,
                'wsProtocols': this.options.wsProtocols
            });
            this.rfb_state = 'loaded';
            return true;
        } catch (err) {
            this.updateState(null, 'fatal', null, 'Unable to create RFB client -- ' + err);
            return false;
        }
    };

    UI.prototype.disconnect = function disconnect() {
        if (this.rfb) {
            this.rfb.disconnect();
        }
    };

    UI.prototype.updateState = function updateState(rfb, state, oldstate, msg) {
        var self = this;
        var portsToTry = [this.options.autoConnect.port].concat(this.options.fallbackPorts);

        function conditionalRetry() {
            if (self.reconnectOnDisconnect) {
              if (self.timesRetried < self.options.retries) {
                  self.timesRetried++;
                  self.disconnect();
                  // shuffle port array around
                  portsToTry = portsToTry.slice(1).concat([portsToTry[0]]);
                  Util.Warn("Could not connect, retrying on port", portsToTry);
                  self.options.autoConnect.port = portsToTry[0];
                  self.options.fallbackPorts = portsToTry.slice(1);
                  self.load(self.options);
              } else if (!self.hasAlerted) {
                  self.hasAlerted = true;
                  self.options.onFailedState();
              }
            }
        }

        this.rfb_state = state;

        switch (state) {
            case 'failed':
            case 'fatal':
                conditionalRetry();
                break;
            case 'normal':
                this.options.onNormalState();
                break;
            case 'disconnected':
                if (oldstate !== 'disconnect' && oldstate !== 'failed') {
                    conditionalRetry();
                }
                this.options.onDisconnected();
                break;
            case 'loaded':
                this.options.onLoaded();
                break;
        }
    };

    UI.prototype.onClipReceive = function onClipReceive(rfb, text) {
        $D(this.options.clipboardReciveId).value = text;
        this.options.onClipReceive();
    };

    UI.prototype.clipSend = function clipSend() {
        if (!this.rfb) return;

        var text = $D(this.options.clipboardSendId).value;
        Util.Debug(">> UI.clipSend: " + text.substr(0,40) + "...");
        this.rfb.clipboardPasteFrom(text);
    };

    UI.prototype.displayBlur = function displayBlur() {
        if (!this.rfb) return;

        this.rfb.get_keyboard().get_target().blur();
        this.rfb.get_keyboard().set_focused(false);
        this.rfb.get_mouse().set_focused(false);
    };

    UI.prototype.displayFocus = function displayFocus() {
        if (!this.rfb) return;

        this.rfb.get_keyboard().get_target().focus();
        this.rfb.get_keyboard().set_focused(true);
        this.rfb.get_mouse().set_focused(true);
    };

    UI.prototype.setViewOnly = function setViewOnly(val) {
        if (!this.rfb) return;

        this.rfb.set_view_only(val);
    };

    /**
     * Enable/disable and configure viewport clipping.
     *
     * @param {Boolean} clip
     */
    UI.prototype.setViewClip = function setViewClip(clip) {
        var display, cur_clip, size, new_w;

        if (this.rfb) {
            display = this.rfb.get_display();
        } else {
            return;
        }

        cur_clip = display.get_viewport();

        if (typeof clip !== 'boolean') {
            // Use current setting
            clip = this.options.clip;
        }

        if (clip && !cur_clip) {
            // Turn clipping on
            this.options.clip = true;
        } else if (!clip && cur_clip) {
            // Turn clipping off
            this.options.clip = false;
            display.set_viewport(false);
            display.set_maxWidth(0);
            display.set_maxHeight(0);
            display.viewportChangeSize();
        }

        if (this.options.clip) {
            display.set_viewport(true);

            size = UI.getCanvasLimit();
            if (size) {
                display.set_maxWidth(size.w);
                display.set_maxHeight(size.h);

                // Hide potential scrollbars that can skew the position
                $D(this.options.canvasContainerId).style.overflow = "hidden";

                // The x position marks the left margin of the canvas,
                // remove the margin from both sides to keep it centered
                new_w = size.w - (2 * Util.getPosition($D(this.options.canvasId)).x);

                $D(this.options.canvasContainerId).style.overflow = "visible";

                display.viewportChangeSize(new_w, size.h);
            }
        }
    };

    UI.prototype.scale = function scale(width, height) {
        var display;

        if (this.rfb) {
            display = this.rfb.get_display();
        } else {
            return;
        }

        var scale = display.autoscale(width, height);

        this.rfb.get_mouse().set_scale(scale);
    };

    UI.prototype.setMouseButton = function setMouseButton(num) {
        if (typeof num === 'undefined') {
            // Disable mouse buttons
            num = -1;
        }

        if (this.rfb) {
            this.rfb.get_mouse().set_touchButton(num);
        }
    };

    window.UI = UI;
})();
