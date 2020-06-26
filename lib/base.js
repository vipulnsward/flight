import utils from "./utils";
import registry from "./registry";
import debug from "./debug";
var componentId = 0;
function teardownInstance(instanceInfo) {
  if (!instanceInfo) {
    return;
  }
  instanceInfo.events.slice().forEach(function (event) {
    var args = [event.type];
    event.element && args.unshift(event.element);
    typeof event.callback == "function" && args.push(event.callback);
    this.off.apply(this, args);
  }, instanceInfo.instance);
}
function checkSerializable(type, data) {
  try {
    window.postMessage(data, "*");
  } catch (e) {
    debug.warn.call(
      this,
      [
        'Event "',
        type,
        '" was triggered with non-serializable data. ',
        "Flight recommends you avoid passing non-serializable data in events.",
      ].join("")
    );
  }
}
function warnAboutReferenceType(key) {
  debug.warn.call(
    this,
    [
      'Attribute "',
      key,
      '" defaults to an array or object. ',
      "Enclose this in a function to avoid sharing between component instances.",
    ].join("")
  );
}
function initAttributes(attrs) {
  var definedKeys = [],
    incomingKeys;
  this.attr = new this.attrDef();
  if (debug.enabled && window.console) {
    for (var key in this.attrDef.prototype) {
      definedKeys.push(key);
    }
    incomingKeys = Object.keys(attrs);
    for (var i = incomingKeys.length - 1; i >= 0; i--) {
      if (definedKeys.indexOf(incomingKeys[i]) == -1) {
        debug.warn.call(
          this,
          'Passed unused attribute "' + incomingKeys[i] + '".'
        );
        break;
      }
    }
  }
  for (var key in this.attrDef.prototype) {
    if (typeof attrs[key] == "undefined") {
      if (this.attr[key] === null) {
        throw new Error(
          'Required attribute "' +
            key +
            '" not specified in attachTo for component "' +
            this.toString() +
            '".'
        );
      }
      if (debug.enabled && typeof this.attr[key] === "object") {
        warnAboutReferenceType.call(this, key);
      }
    } else {
      this.attr[key] = attrs[key];
    }
    if (typeof this.attr[key] == "function") {
      this.attr[key] = this.attr[key].call(this);
    }
  }
}
function initDeprecatedAttributes(attrs) {
  if (debug.enabled) {
    debug.warn.call(
      this,
      "defaultAttrs will be removed in a future version. Please use attributes."
    );
  }
  var attr = Object.create(attrs);
  for (var key in this.defaults) {
    if (!attrs.hasOwnProperty(key)) {
      attr[key] = this.defaults[key];
      if (debug.enabled && typeof this.defaults[key] === "object") {
        warnAboutReferenceType.call(this, key);
      }
    }
  }
  this.attr = attr;
  Object.keys(this.defaults || {}).forEach(function (key) {
    if (this.defaults[key] === null && this.attr[key] === null) {
      throw new Error(
        'Required attribute "' +
          key +
          '" not specified in attachTo for component "' +
          this.toString() +
          '".'
      );
    }
  }, this);
}
function proxyEventTo(targetEvent) {
  return function (e, data) {
    $(e.target).trigger(targetEvent, data);
  };
}
function withBase() {
  this.trigger = function () {
    var $element, type, data, event, defaultFn;
    var lastIndex = arguments.length - 1,
      lastArg = arguments[lastIndex];
    if (typeof lastArg != "string" && !(lastArg && lastArg.defaultBehavior)) {
      lastIndex--;
      data = lastArg;
    }
    if (lastIndex == 1) {
      $element = $(arguments[0]);
      event = arguments[1];
    } else {
      $element = this.$node;
      event = arguments[0];
    }
    if (event.defaultBehavior) {
      defaultFn = event.defaultBehavior;
      event = $.Event(event.type);
    }
    type = event.type || event;
    if (debug.enabled && window.postMessage) {
      checkSerializable.call(this, type, data);
    }
    if (typeof this.attr.eventData == "object") {
      data = $.extend(true, {}, this.attr.eventData, data);
    }
    $element.trigger(event || type, data);
    if (defaultFn && !event.isDefaultPrevented()) {
      (this[defaultFn] || defaultFn).call(this, event, data);
    }
    return $element;
  };
  this.on = function () {
    var $element, type, callback, originalCb;
    var lastIndex = arguments.length - 1,
      origin = arguments[lastIndex];
    if (typeof origin == "object") {
      originalCb = utils.delegate(this.resolveDelegateRules(origin));
    } else if (typeof origin == "string") {
      originalCb = proxyEventTo(origin);
    } else {
      originalCb = origin;
    }
    if (lastIndex == 2) {
      $element = $(arguments[0]);
      type = arguments[1];
    } else {
      $element = this.$node;
      type = arguments[0];
    }
    if (typeof originalCb != "function" && typeof originalCb != "object") {
      throw new Error(
        'Unable to bind to "' +
          type +
          '" because the given callback is not a function or an object'
      );
    }
    callback = originalCb.bind(this);
    callback.target = originalCb;
    callback.context = this;
    $element.on(type, callback);
    originalCb.bound || (originalCb.bound = []);
    originalCb.bound.push(callback);
    return callback;
  };
  this.off = function () {
    var $element, type, callback;
    var lastIndex = arguments.length - 1;
    if (typeof arguments[lastIndex] == "function") {
      callback = arguments[lastIndex];
      lastIndex -= 1;
    }
    if (lastIndex == 1) {
      $element = $(arguments[0]);
      type = arguments[1];
    } else {
      $element = this.$node;
      type = arguments[0];
    }
    if (callback) {
      var boundFunctions = callback.target
        ? callback.target.bound
        : callback.bound || [];
      boundFunctions &&
        boundFunctions.some(function (fn, i, arr) {
          if (fn.context && this.identity == fn.context.identity) {
            arr.splice(i, 1);
            callback = fn;
            return true;
          }
        }, this);
      $element.off(type, callback);
    } else {
      registry.findInstanceInfo(this).events.forEach(function (event) {
        if (type == event.type) {
          $element.off(type, event.callback);
        }
      });
    }
    return $element;
  };
  this.resolveDelegateRules = function (ruleInfo) {
    var rules = {};
    Object.keys(ruleInfo).forEach(function (r) {
      if (!(r in this.attr)) {
        throw new Error(
          'Component "' +
            this.toString() +
            '" wants to listen on "' +
            r +
            '" but no such attribute was defined.'
        );
      }
      rules[this.attr[r]] =
        typeof ruleInfo[r] == "string"
          ? proxyEventTo(ruleInfo[r])
          : ruleInfo[r];
    }, this);
    return rules;
  };
  this.select = function (attributeKey) {
    return this.$node.find(this.attr[attributeKey]);
  };
  this.attributes = function (attrs) {
    var Attributes = function () {};
    if (this.attrDef) {
      Attributes.prototype = new this.attrDef();
    }
    for (var name in attrs) {
      Attributes.prototype[name] = attrs[name];
    }
    this.attrDef = Attributes;
  };
  this.defaultAttrs = function (defaults) {
    utils.push(this.defaults, defaults, true) || (this.defaults = defaults);
  };
  this.initialize = function (node, attrs) {
    attrs = attrs || {};
    this.identity || (this.identity = componentId++);
    if (!node) {
      throw new Error("Component needs a node");
    }
    if (node.jquery) {
      this.node = node[0];
      this.$node = node;
    } else {
      this.node = node;
      this.$node = $(node);
    }
    if (this.attrDef) {
      initAttributes.call(this, attrs);
    } else {
      initDeprecatedAttributes.call(this, attrs);
    }
    return this;
  };
  this.teardown = function () {
    var instanceInfo = registry.findInstanceInfo(this);
    if (instanceInfo) {
      teardownInstance(instanceInfo);
    }
  };
}
export default withBase;
