'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      define(['exports'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
      factory(exports);
  } else {
      factory((root.protocols = {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {

}));
