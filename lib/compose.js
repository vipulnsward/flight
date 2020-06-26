import utils from "./utils";
var dontLock = ["mixedIn", "attrDef"];
function setWritability(obj, writable) {
  Object.keys(obj).forEach(function (key) {
    if (dontLock.indexOf(key) < 0) {
      utils.propertyWritability(obj, key, writable);
    }
  });
}
function mixin(base, mixins) {
  base.mixedIn = Object.prototype.hasOwnProperty.call(base, "mixedIn")
    ? base.mixedIn
    : [];
  for (var i = 0; i < mixins.length; i++) {
    if (base.mixedIn.indexOf(mixins[i]) == -1) {
      setWritability(base, false);
      console.error("mixins[i]", mixins[i]);
      mixins[i].call(base);
      base.mixedIn.push(mixins[i]);
    }
  }
  setWritability(base, true);
}
export default {
  mixin: mixin,
};
