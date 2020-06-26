import advice from "./advice";
import utils from "./utils";
import compose from "./compose";
import withBase from "./base";
import registry from "./registry";
import withLogging from "./logger";
import debug from "./debug";
var functionNameRegEx = /function (.*?)\s?\(/;
var ignoredMixin = {
  withBase: true,
  withLogging: true,
};
function teardownAll() {
  var componentInfo = registry.findComponentInfo(this);
  componentInfo &&
    Object.keys(componentInfo.instances).forEach(function (k) {
      var info = componentInfo.instances[k];
      if (info && info.instance) {
        info.instance.teardown();
      }
    });
}
function attachTo(selector) {
  var l = arguments.length;
  var args = new Array(l - 1);
  for (var i = 1; i < l; i++) {
    args[i - 1] = arguments[i];
  }
  if (!selector) {
    throw new Error(
      "Component needs to be attachTo'd a jQuery object, native node or selector string"
    );
  }
  var options = utils.merge.apply(utils, args);
  var componentInfo = registry.findComponentInfo(this);
  $(selector).each(
    function (i, node) {
      if (componentInfo && componentInfo.isAttachedTo(node)) {
        return;
      }
      new this().initialize(node, options);
    }.bind(this)
  );
}
function prettyPrintMixins() {
  var mixedIn = this.mixedIn || this.prototype.mixedIn || [];
  return mixedIn
    .map(function (mixin) {
      if (mixin.name == null) {
        var m = mixin.toString().match(functionNameRegEx);
        return m && m[1] ? m[1] : "";
      }
      return !ignoredMixin[mixin.name] ? mixin.name : "";
    })
    .filter(Boolean)
    .join(", ");
}
function defineComponent() {
  var l = arguments.length;
  var mixins = new Array(l);
  for (var i = 0; i < l; i++) {
    mixins[i] = arguments[i];
  }
  var Component = function () {};
  Component.toString = Component.prototype.toString = prettyPrintMixins;
  if (debug.enabled) {
    Component.describe = Component.prototype.describe = Component.toString();
  }
  Component.attachTo = attachTo;
  Component.mixin = function () {
    var newComponent = defineComponent();
    var newPrototype = Object.create(Component.prototype);
    newPrototype.mixedIn = [].concat(Component.prototype.mixedIn);
    newPrototype.defaults = utils.merge(Component.prototype.defaults);
    newPrototype.attrDef = Component.prototype.attrDef;
    compose.mixin(newPrototype, arguments);
    newComponent.prototype = newPrototype;
    newComponent.prototype.constructor = newComponent;
    return newComponent;
  };
  Component.teardownAll = teardownAll;
  if (debug.enabled) {
    mixins.unshift(withLogging);
  }
  mixins.unshift(withBase, advice.withAdvice, registry.withRegistration);
  compose.mixin(Component.prototype, mixins);
  return Component;
}
defineComponent.teardownAll = function () {
  registry.components.slice().forEach(function (c) {
    c.component.teardownAll();
  });
  registry.reset();
};
export default defineComponent;
