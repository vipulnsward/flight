import debug from "./debug";
var DEFAULT_INTERVAL = 100;
function canWriteProtect() {
  var writeProtectSupported =
    debug.enabled && !Object.propertyIsEnumerable("getOwnPropertyDescriptor");
  if (writeProtectSupported) {
    try {
      Object.getOwnPropertyDescriptor(Object, "keys");
    } catch (e) {
      return false;
    }
  }
  return writeProtectSupported;
}
var utils = {
  isDomObj: function (obj) {
    return !!(obj.nodeType || obj === window);
  },
  toArray: function (obj, from) {
    from = from || 0;
    var len = obj.length,
      arr = new Array(len - from);
    for (var i = from; i < len; i++) {
      arr[i - from] = obj[i];
    }
    return arr;
  },
  merge: function () {
    var l = arguments.length,
      args = new Array(l + 1);
    if (l === 0) {
      return {};
    }
    for (var i = 0; i < l; i++) {
      args[i + 1] = arguments[i];
    }
    args[0] = {};
    if (args[args.length - 1] === true) {
      args.pop();
      args.unshift(true);
    }
    return $.extend.apply(undefined, args);
  },
  push: function (base, extra, protect) {
    if (base) {
      Object.keys(extra || {}).forEach(function (key) {
        if (base[key] && protect) {
          throw new Error(
            'utils.push attempted to overwrite "' +
              key +
              '" while running in protected mode'
          );
        }
        if (typeof base[key] == "object" && typeof extra[key] == "object") {
          this.push(base[key], extra[key]);
        } else {
          base[key] = extra[key];
        }
      }, this);
    }
    return base;
  },
  getEnumerableProperty: function (obj, key) {
    return obj.propertyIsEnumerable(key) ? obj[key] : undefined;
  },
  compose: function () {
    var funcs = arguments;
    return function () {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  },
  uniqueArray: function (array) {
    var u = {},
      a = [];
    for (var i = 0, l = array.length; i < l; ++i) {
      if (u.hasOwnProperty(array[i])) {
        continue;
      }
      a.push(array[i]);
      u[array[i]] = 1;
    }
    return a;
  },
  debounce: function (func, wait, immediate) {
    if (typeof wait != "number") {
      wait = DEFAULT_INTERVAL;
    }
    var timeout, result;
    return function () {
      var context = this,
        args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      timeout && clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
      }
      return result;
    };
  },
  throttle: function (func, wait) {
    if (typeof wait != "number") {
      wait = DEFAULT_INTERVAL;
    }
    var context, args, timeout, throttling, more, result;
    var whenDone = this.debounce(function () {
      more = throttling = false;
    }, wait);
    return function () {
      context = this;
      args = arguments;
      var later = function () {
        timeout = null;
        if (more) {
          result = func.apply(context, args);
        }
        whenDone();
      };
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (throttling) {
        more = true;
      } else {
        throttling = true;
        result = func.apply(context, args);
      }
      whenDone();
      return result;
    };
  },
  countThen: function (num, base) {
    return function () {
      if (!--num) {
        return base.apply(this, arguments);
      }
    };
  },
  delegate: function (rules) {
    return function (e, data) {
      var target = $(e.target),
        parent;
      Object.keys(rules).forEach(function (selector) {
        if (
          !e.isPropagationStopped() &&
          (parent = target.closest(selector)).length
        ) {
          data = data || {};
          e.currentTarget = data.el = parent[0];
          return rules[selector].apply(this, [e, data]);
        }
      }, this);
    };
  },
  once: function (func) {
    var ran, result;
    return function () {
      if (ran) {
        return result;
      }
      ran = true;
      result = func.apply(this, arguments);
      return result;
    };
  },
  propertyWritability: function (obj, prop, writable) {
    if (canWriteProtect() && obj.hasOwnProperty(prop)) {
      Object.defineProperty(obj, prop, {
        writable: writable,
      });
    }
  },
  mutateProperty: function (obj, prop, op) {
    var writable;
    if (!canWriteProtect() || !obj.hasOwnProperty(prop)) {
      op.call(obj);
      return;
    }
    writable = Object.getOwnPropertyDescriptor(obj, prop).writable;
    Object.defineProperty(obj, prop, {
      writable: true,
    });
    op.call(obj);
    Object.defineProperty(obj, prop, {
      writable: writable,
    });
  },
};
export default utils;
