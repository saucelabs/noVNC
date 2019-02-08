/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2018 The noVNC Authors
 * Licensed under MPL 2.0 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */

/*
 * Logging/debug routines
 */

let _log_level = 'warn';

const logDebug = (...args) => window.console.debug(...args);
const logInfo = (...args) => window.console.info(...args);
const logWarn = (...args) => window.console.warn(...args);
const logError = (...args) => window.console.error(...args);
const noop = () => {};
let Debug = noop;
let Info = noop;
let Warn = noop;
let Error = noop;

export function init_logging(level) {
    if (typeof level === 'undefined') {
        level = _log_level;
    } else {
        _log_level = level;
    }

    Debug = Info = Warn = Error = noop;

    if (typeof window.console !== "undefined") {
        /* eslint-disable no-console, no-fallthrough */
        switch (level) {
            case 'debug':
                Debug = logDebug;
            case 'info':
                Info  = logInfo;
            case 'warn':
                Warn  = logWarn;
            case 'error':
                Error = logError;
            case 'none':
                break;
            default:
                throw new Error("invalid logging type '" + level + "'");
        }
        /* eslint-enable no-console, no-fallthrough */
    }
}

export function get_logging() {
    return _log_level;
}

export { Debug, Info, Warn, Error };

// Initialize logging level
init_logging();
