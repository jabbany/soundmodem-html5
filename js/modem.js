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

  function AFSKModulator() {
    this.modulateAs = null;

    this.dataBits = (typeof dataBits == 'number') ? dataBits : 8;
    this.parity = '';
    this.stopBits = (typeof stopBits == 'number') ? stopBits : 1;

    this.output = null;
    this.oscillator = null;
  }

  AFSKModulator.prototype.setOutput = function (context, modulateAs) {
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

  AFSKModulator.prototype.connect = function () {
    if (this.output !== null) {
      if (this.oscillator === null) {
        this.oscillator = this.output.createOscillator();
      }

      // Setup the output
      this.oscillator.type = 'sine';
      // Start the line on high
      this.oscillator.frequency.setValueAtTime(this.modulateAs[1], this.output.currentTime);
      this.oscillator.connect(this.output.destination);
      this.oscillator.start();
    }
  }

  AFSKModulator.prototype.disconnect = function () {
    if (this.output !== null) {
      // Teardown output
      if (this.oscillator !== null) {
        this.oscillator.stop();
        this.oscillator.disconnect(this.output.destination);
        this.oscillator = null;
      }
      this.output = null;
    }

  }

  AFSKModulator.prototype.send = function (message, baud, dataBits, stopBits) {
    if (this.oscillator === null) {
      // Start the oscillator if we can
      if (this.output !== null) {
        this.connect();
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

    // Cancel any pending transfers
    this.oscillator.frequency.cancelScheduledValues(baseTime);

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



  AFSKModulator.prototype.stop = function () {
    if (this.oscillator !== null) {
      // Stop
      this.oscillator.stop();
    }
  }

  function AFSKDemodulator(mark, space, bps) {
    this.mark = mark;
    this.space = space;
    this.bps = 0;

    this.input = null;

    this.oscillator = null;
    this.analyzer = null;

    this._pollTimer = null;
    this._fifo = [];
    this._pendingRead = null;
    this._buffer = '';
  }

  AFSKDemodulator.prototype._onSignal = function () {
    if (this.demodulateAs === null || this.input === null || this.analyzer === null) {
      try {
        clearInterval(this._pollTimer);
      } catch (e) {}
      return;
    }
    let freqs = new Uint8Array(this.analyzer.frequencyBinCount);
    this.analyzer.getByteFrequencyData(freqs);
    // Check if each tone is triggered
    let levels = this.demodulateAs.map(function (bins) {
      return bins.reduce(function (acc, id) { return acc + freqs[id]; }, 0);
    });

    let background = levels.reduce(function (a, b) { return a + b; }, 0) / levels.length;
    console.log(levels.map(function (l) { return l > background; }));
    console.log(levels);
  }

  AFSKDemodulator.prototype._onData = function (data) {
    this._buffer += data;
    if (this._pendingRead !== null) {
      // Figure out if the read should trigger
      if (this._pendingRead.threshold <= this._buffer.length) {
        // yes
        try {
          this._pendingRead.consume(this._buffer);
          this._buffer = '';
        } catch (e) {  }
      }
    }
  }

  AFSKDemodulator.prototype.connect = function () {
    if (this.input === null) {
      // Connect
    }
  }

  AFSKDemodulator.prototype.disconnect = function () {
    if (this.input !== null) {
      // Teardown input
      if (this.analyzer !== null) {
        this.input.source.disconnect(this.analyzer);
        this.analyzer = null;
      }
      try {
        this.input.stream.getTracks().forEach(function (track) {
          track.stop();
        });
      } catch (e) { console.log(e); };
      this.input = null;
    }
  }

  AFSKDemodulator.prototype.setInput = function (context, stream, demodulateAs) {
    this.demodulateAs = AFSK_TONESETS[demodulateAs];

    this.input = {
      'context': context,
      'stream': stream,
      'source': context.createMediaStreamSource(stream)
    };
    /**
     * We're going to learn from https://github.com/mobilinkd/afsk-demodulator/blob/master/afsk-demodulator.ipynb
     * and build a demodulator
     */

    // First we want to do a bandpass filter that filters to just
  }

  AFSKDemodulator.prototype.recv = function (bufferSize, timeout) {
    // returns a promise that is resolved as soon as "bufferSize" bits are received or "timeout" has elapsed
    var promises = [];
    var pendingReadHandle = {
      'threshold': bufferSize
    };
    this._pendingRead = pendingReadHandle;

    promises.push(new Promise(function (resolve, reject) {
      pendingReadHandle.consume = resolve;
      pendingReadHandle.fail = reject;
    }).catch((function () {
      // Data read failed
      this._pendingRead = null;
    }).bind(this)).then((function (data) {
      this._pendingRead = null;
      return data;
    }).bind(this)));

    if (typeof timeout === 'number' && timeout > 0) {
      // If timeout was specified, use that too
      promises.push(new Promise(function (_, reject) {
        setTimeout(function () {
          // Fail the previous promise
          pendingReadHandle.fail();
          // And reject this one too.
          reject();
        }, timeout);
      }));
    }

    return Promise.race(promises).catch((function (e) {
      // The timer triggered
      this._pendingRead = null;
      return '';
    }).bind(this));
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

  DTMFModem.prototype.connect = function () {
    // create the oscillators
    if (this.output !== null) {
      if (this.oscillatorHigh === null) {
        this.oscillatorHigh = this.output.createOscillator();
        this.oscillatorHigh.connect(this.output.destination);
        this.oscillatorHigh.frequency.value = 0;
        this.oscillatorHigh.start();
      }
      if (this.oscillatorLow === null) {
        this.oscillatorLow = this.output.createOscillator();
        this.oscillatorLow.connect(this.output.destination);
        this.oscillatorLow.frequency.value = 0;
        this.oscillatorLow.start();
      }
    }
  }

  DTMFModem.prototype.disconnect = function () {
    if (this.oscillatorHigh !== null) {
      this.oscillatorHigh.stop();
      this.oscillatorHigh.disconnect(this.output.destination);
      this.oscillatorHigh = null;
    }
    if (this.oscillatorLow !== null) {
      this.oscillatorLow.stop();
      this.oscillatorLow.disconnect(this.output.destination);
      this.oscillatorLow = null;
    }
  }

  DTMFModem.prototype.dial = function (number, toneLength, spaceLength) {
    if (this.oscillatorHigh === null || this.oscillatorLow === null) {
      // Start the oscillator if we can
      if (this.output !== null) {
        this.connect();
      } else {
        throw new Error('Dial: No output available. Cannot send.');
      }
    }

    if (typeof toneLength !== 'number') {
      toneLength = 0.04;
    }
    if (typeof spaceLength !== 'number') {
      spaceLength = 0.04;
    }

    // Convert into symbols
    if (typeof number !== 'string') {
      number = number.map(function (charCode) {return String.fromCharCode(charCode)}).join('');
    }

    var baseTime = this.output.currentTime;
    var wordLength = toneLength + spaceLength;

    // Cancel any pending transfers
    this.oscillatorLow.frequency.cancelScheduledValues(baseTime);
    this.oscillatorHigh.frequency.cancelScheduledValues(baseTime);

    for (var i = 0; i < number.length; i++) {
      var key = number.charAt(i);
      if (key in DTMF_TONES) {
        // Only dial the allowed keys
        this.oscillatorLow.frequency.setValueAtTime(DTMF_TONES[key][0], baseTime + wordLength * i);
        this.oscillatorHigh.frequency.setValueAtTime(DTMF_TONES[key][1], baseTime + wordLength * i);
        this.oscillatorLow.frequency.setValueAtTime(0, baseTime + wordLength * i + toneLength);
        this.oscillatorHigh.frequency.setValueAtTime(0, baseTime + wordLength * i + toneLength);
      }
    }
  }

  function DPSKModem() {

  }

  exports.AFSKModulator = AFSKModulator;
  exports.AFSKDemodulator = AFSKDemodulator;
  exports.DTMFModem = DTMFModem;
  exports.DPSKModem = DPSKModem;
}));
