'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      define(['exports'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
      factory(exports);
  } else {
      factory((root.modem = {}));
  }
}(typeof self !== 'undefined' ? self : this, function (exports, b) {

  /*
    Tonesets are indicated as space(0), mark(1)
  */
  const AFSK_TONESETS = {
    'bell103-originating': [1070, 1270],
    'bell103-answering': [2025, 2225],
    'bell202': [2200, 1200],
  };

  function AFSKModem() {
    this.modulateAs = null;
    this.demodulateAs = null;

    this.dataBits = (typeof dataBits == 'number') ? dataBits : 8;
    this.parity = '';
    this.stopBits = (typeof stopBits == 'number') ? stopBits : 1;

    this.input = null;
    this.output = null;
    this.oscillator = null;
  }

  AFSKModem

  AFSKModem.prototype.setInput = function (context, demodulateAs) {
    this.demodulateAs = AFSK_TONESETS[demodulateAs];

    this.input = context;
  }

  AFSKModem.prototype.setOutput = function (context, modulateAs) {
    this.modulateAs = AFSK_TONESETS[modulateAs];

    if (this.output === null) {
      this.output = context;
    } else {
      // We're swapping outputs
      if (this.oscillator !== null) {
        this.oscillator.disconnect(this.output.destination);
        this.oscillator.connect(context.destination);
      }
      this.output = context;
    }
  }

  AFSKModem.prototype.connect = function () {
    if (this.output !== null) {
      if (this.oscillator === null) {
        this.oscillator = this.output.createOscillator();
      }

      // Setup the output
      this.oscillator.type == 'sine';
      // Start the line on high
      this.oscillator.frequency.setValueAtTime(this.modulateAs[1], this.output.currentTime);
      this.oscillator.connect(this.output.destination);
      this.oscillator.start();
    }
    if (this.input !== null) {
      // Setup the input
    }
  }

  AFSKModem.prototype.disconnect = function () {
    if (this.output !== null) {
      // Teardown output
      if (this.oscillator !== null) {
        this.oscillator.stop();
        this.oscillator.disconnect(this.output.destination);
        this.oscillator = null;
      }
      this.output = null;
    }
    if (this.input !== null) {
      // Teardown input
      this.input = null;
    }
  }

  AFSKModem.prototype.send = function (message, baud, dataBits, stopBits) {
    if (this.oscillator === null) {
      // Start the oscillator if we can
      if (this.output !== null) {
        this.start();
      } else {
        throw new Error('Send: No output available. Cannot send.');
      }
    }

    if (typeof baud === 'string') {
      baud = parseInt(baud, 10);
    }
    if (typeof dataBits === 'string') {
      dataBits = parseInt(dataBits, 10);
    }
    if (typeof stopBits === 'string') {
      stopBits = parseInt(stopBits, 10);
    }

    var baseInterval = 1 / baud;
    var baseTime = this.output.currentTime;
    var wordLength = dataBits + stopBits + 1;

    var bytes = [];
    if (typeof message === 'string') {
      // Convert to byte-array
      for (var i = 0; i < message.length; i++) {
        bytes.push(message.charCodeAt(i));
      }
    } else if (Array.isArray(message)) {
      bytes = message;
    }

    bytes.forEach((function (byte, i) {
      this.oscillator.frequency.setValueAtTime(
        this.modulateAs[0],
        baseTime + baseInterval * wordLength * i);

      for (var b = 0; b < dataBits; b++) {
        this.oscillator.frequency.setValueAtTime(
          this.modulateAs[(byte) % 2],
          baseTime +
            baseInterval * (wordLength * i + b + 1)); // Little endian
          byte >>= 1; // shift
      }

      this.oscillator.frequency.setValueAtTime(
        this.modulateAs[1],
        baseTime +
          baseInterval * (wordLength * i + dataBits + 1));
    }).bind(this));

    // Return the line to high
    this.oscillator.frequency.setValueAtTime(
      this.modulateAs[1],
      baseTime + baseInterval * (wordLength * bytes.length));
  }

  AFSKModem.prototype.stop = function () {
    if (this.oscillator !== null) {
      // Stop
      this.oscillator.stop();
    }
  }

  const DTMF_TONES = {
    '1': [697, 1209],
    '2': [697, 1336],
    '3': [697, 1477],
    'A': [697, 1633],
    '4': [770, 1209],
    '5': [770, 1336],
    '6': [770, 1477],
    'B': [770, 1633],
    '7': [852, 1209],
    '8': [852, 1336],
    '9': [852, 1477],
    'C': [852, 1633],
    '*': [941, 1209],
    '0': [941, 1336],
    '#': [941, 1477],
    'D': [941, 1633],
  }

  function DTMFModem() {
    this.output = null;
    this.input = null;

    this.oscillatorLow = null;
    this.oscillatorHigh = null;
  }

  DTMFModem.prototype.setInput = function (context) {
    this.input = context;
  }

  DTMFModem.prototype.setOutput = function (context) {
    this.output = context;
  }

  DTMFModem.prototype.dial = function (number, keyDown, space) {

  }

  exports.AFSKModem = AFSKModem;
  exports.DTMFModem = DTMFModem;
}));
