'use strict';

(function (modem) {
  function $(e) {
    var elements = document.querySelectorAll(e);
    if (elements.length === 0) {
      return null;
    } else if (elements.length === 1) {
      return elements[0];
    } else {
      return elements;
    }
  }

  const MATCHING_PROTOCOLS = {
    'bell103-originating': 'bell103-answering',
    'bell103-answering': 'bell103-originating',
    'bell202': 'bell202',
    'dtmf': 'dtmf'
  };

  const AUTO_CONFIG = {
    'bell103-originating': {
      'baud': '300',
    },
    'bell103-answering': {
      'baud': '300',
    },
    'bell202': {
      'baud': '1200',
    }
  }

  window.addEventListener('load', function () {
    var currentSendModem = null, currentRecvModem = null;

    $('#connect').addEventListener('click', function () {
      if (currentSendModem === null && currentRecvModem === null) {
        // Figure out the modems needed
        if ($('#output-enable').checked) {
          if ($('#modem-select-out').value === 'dtmf') {
            currentSendModem = new modem.DTMFModem();
          } else {
            currentSendModem = new modem.AFSKModulator();
          }
          currentSendModem.setOutput(new AudioContext(), $('#modem-select-out').value);
          currentSendModem.connect();
        }
        if ($('#input-enable').checked) {
          if ($('#modem-select-in').value === 'dtmf') {
            currentRecvModem = new modem.DTMFModem();
          } else {
            currentRecvModem = new modem.AFSKDemodulator();
          }
          // Get the microphone
          navigator.mediaDevices.getUserMedia({ 'audio': true }).then(function (stream) {
            currentRecvModem.setInput(new AudioContext(), stream, $('#modem-select-in').value);
            currentRecvModem.connect();
          });

        }
        if (currentSendModem === null && currentRecvModem === null) {
          alert('You have not enabled send or receive.');
        } else {
          // Update the button
          $('#connect').innerText = 'Disconnect';
        }
      } else {
        if (currentSendModem !== null) {
          currentSendModem.disconnect();
          currentSendModem = null;
        }
        if (currentRecvModem !== null) {
          currentRecvModem.disconnect();
          currentRecvModem = null;
        }
        // Update the button
        $('#connect').innerText = 'Connect';
      }
    });

    // Bind the toggles
    $('#modem-select-out').addEventListener('change', function (e) {
      if ($('#match-input-output').checked) {
        $('#modem-select-in').value = MATCHING_PROTOCOLS[$('#modem-select-out').value];
      }
      if ($('#auto-config').checked) {
        var config = AUTO_CONFIG[$('#modem-select-out').value];
        if (typeof config !== 'undefined' && config !== null) {
          for (var key in config) {
            $('#config-' + key).value = config[key];
          }
        }
      }
    });
    $('#modem-select-in').addEventListener('change', function (e) {
      if ($('#match-input-output').checked) {
        $('#modem-select-out').value = MATCHING_PROTOCOLS[$('#modem-select-in').value];
      }
      if ($('#auto-config').checked) {
        var config = AUTO_CONFIG[$('#modem-select-in').value];
        if (typeof config !== 'undefined' && config !== null) {
          for (var key in config) {
            $('#config-' + key).value = config[key];
          }
        }
      }
    })

    var currentTerminal = $('#text-buffer');
    function inputWrite(data) {
      if (currentSendModem === null || currentSendModem.output === null) {
        return;
      }

      if ($('#modem-select-out').value === 'dtmf') {
        currentSendModem.dial(data);
      } else {
        currentSendModem.send(data,
          $('#config-baud').value, $('#config-data-bits').value, $('#config-stop-bits').value);
      }
    }

    function outputWrite(data) {
      if (currentTerminal instanceof HTMLTextAreaElement) {
        // Using text term
        currentTerminal.value += data;
      } else {
        currentTerminal.write(data);
      }
    }

    // Bind text-buffer terminal
    $('#text-buffer').addEventListener('paste', function (e) {
      e.preventDefault();

      var data = (e.clipboardData || window.clipboardData).getData("text");
      inputWrite(data);
    });

    $('#text-buffer').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key == 'v') {
        return; // paste
      }
      e.preventDefault();

      var keyCodes = [];
      if (e.key.length === 1) {
        keyCodes.push(e.key.charCodeAt(0));
      } else if (e.key === 'Enter') {
        keyCodes.push(13);
        keyCodes.push(10);
      } else if (e.key === 'Tab') {
        keyCodes.push(9);
      } else if (e.key === 'Backspace') {
        keyCodes.push(8);
      } else if (e.key === 'Delete') {
        keyCodes.push(127)
      }
      if (keyCodes.length > 0) {
        inputWrite(keyCodes);
      }
    });

    // Bind XTerm terminal
    if (Terminal) {
      var xterm = new Terminal({'cols': 80, 'rows': 24});
      xterm.open($('#term-buffer'));
    } else {
      // Xterm support not present
      $('#buffer-mode-simple,#buffer-mode-xterm').forEach(function (e) {
        e.setAttribute('disabled', 'disabled');
      });
    }
    $('#buffer-mode-simple,#buffer-mode-xterm').forEach(function (e) {
      e.addEventListener('click', function () {
        if ($('#buffer-mode-simple').checked) {
          currentTerminal = $('#text-buffer');
          $('#text-buffer').style.display = '';
          $('#term-buffer').style.display = 'none';
        } else {
          currentTerminal = xterm;
          $('#text-buffer').style.display = 'none';
          $('#term-buffer').style.display = '';
        }
      })
    })
  });

})(this.modem);
