/* Copyright 2013 Twitter, Inc. Licensed under The MIT License. http://opensource.org/licenses/MIT */

define(

  [
    './utils'
  ],

  function(utils) {
    'use strict';

    var dontLock = ['mixedIn', 'attrDef'];

    function setWritability(obj, writable) {
      Object.keys(obj).forEach(function (key) {
        if (dontLock.indexOf(key) < 0) {
          utils.propertyWritability(obj, key, writable);
        }
      });
    }

    function mixin(base, mixins) {
      base.mixedIn = Object.prototype.hasOwnProperty.call(base, 'mixedIn') ? base.mixedIn : [];

      for (var i = 0; i < mixins.length; i++) {
        if (base.mixedIn.indexOf(mixins[i]) == -1) {
          setWritability(base, false);
          var fn = mixins[i];
          if (!!fn.default) {
            fn = fn.default;
          }
          fn.call(base);
          base.mixedIn.push(fn);
        }
      }

      setWritability(base, true);
    }

    return {
      mixin: mixin
    };

  }
);
