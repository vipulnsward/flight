import utils from "./utils";
var advice = {
  around: function (base, wrapped) {
    return function composedAround() {
      var i = 0,
        l = arguments.length,
        args = new Array(l + 1);
      args[0] = base.bind(this);
      for (; i < l; i++) {
        args[i + 1] = arguments[i];
      }
      return wrapped.apply(this, args);
    };
  },
  before: function (base, before) {
    var beforeFn =
      typeof before == "function" ? before : before.obj[before.fnName];
    return function composedBefore() {
      beforeFn.apply(this, arguments);
      return base.apply(this, arguments);
    };
  },
  after: function (base, after) {
    var afterFn = typeof after == "function" ? after : after.obj[after.fnName];
    return function composedAfter() {
      var res = (base.unbound || base).apply(this, arguments);
      afterFn.apply(this, arguments);
      return res;
    };
  },
  withAdvice: function () {
    ["before", "after", "around"].forEach(function (m) {
      this[m] = function (method, fn) {
        var methods = method.trim().split(" ");
        methods.forEach(function (i) {
          utils.mutateProperty(this, i, function () {
            if (typeof this[i] == "function") {
              this[i] = advice[m](this[i], fn);
            } else {
              this[i] = fn;
            }
            return this[i];
          });
        }, this);
      };
    }, this);
  },
};
export default advice;
