import utils from "./utils";
var actionSymbols = {
  on: "<-",
  trigger: "->",
  off: "x ",
};
function elemToString(elem) {
  var tagStr = elem.tagName ? elem.tagName.toLowerCase() : elem.toString();
  var classStr = elem.className ? "." + elem.className : "";
  var result = tagStr + classStr;
  return elem.tagName ? ["'", "'"].join(result) : result;
}
function log(action, component, eventArgs) {
  if (!window.DEBUG || !window.DEBUG.enabled) {
    return;
  }
  var name,
    eventType,
    elem,
    fn,
    payload,
    logFilter,
    toRegExp,
    actionLoggable,
    nameLoggable,
    info;
  if (typeof eventArgs[eventArgs.length - 1] == "function") {
    fn = eventArgs.pop();
    fn = fn.unbound || fn;
  }
  if (eventArgs.length == 1) {
    elem = component.$node[0];
    eventType = eventArgs[0];
  } else if (
    eventArgs.length == 2 &&
    typeof eventArgs[1] == "object" &&
    !eventArgs[1].type
  ) {
    elem = component.$node[0];
    eventType = eventArgs[0];
    if (action == "trigger") {
      payload = eventArgs[1];
    }
  } else {
    elem = eventArgs[0];
    eventType = eventArgs[1];
    if (action == "trigger") {
      payload = eventArgs[2];
    }
  }
  name = typeof eventType == "object" ? eventType.type : eventType;
  logFilter = window.DEBUG.events.logFilter;
  actionLoggable =
    logFilter.actions == "all" || logFilter.actions.indexOf(action) > -1;
  toRegExp = function (expr) {
    return expr.test ? expr : new RegExp("^" + expr.replace(/\*/g, ".*") + "$");
  };
  nameLoggable =
    logFilter.eventNames == "all" ||
    logFilter.eventNames.some(function (e) {
      return toRegExp(e).test(name);
    });
  if (actionLoggable && nameLoggable) {
    info = [actionSymbols[action], action, "[" + name + "]"];
    payload && info.push(payload);
    info.push(elemToString(elem));
    info.push(component.constructor.describe.split(" ").slice(0, 3).join(" "));
    console.groupCollapsed &&
      action == "trigger" &&
      console.groupCollapsed(action, name);
    Function.prototype.apply.call(console.info, console, info);
  }
}
function withLogging() {
  this.before("trigger", function () {
    log("trigger", this, utils.toArray(arguments));
  });
  if (console.groupCollapsed) {
    this.after("trigger", function () {
      console.groupEnd();
    });
  }
  this.before("on", function () {
    log("on", this, utils.toArray(arguments));
  });
  this.before("off", function () {
    log("off", this, utils.toArray(arguments));
  });
}
export default withLogging;
