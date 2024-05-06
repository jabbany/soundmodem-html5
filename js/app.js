'use strict';

(function () {
  function $(e) { return document.getElementById(e); }
  window.addEventListener('load', function () {
    var currentModem = null;
    $('connect').addEventListener('click', function () {
      if (currentModem === null) {
        currentModem = new modem.AFSKModem();
        currentModem.setOutput(new AudioContext(), $('modem-select-out').value);
        currentModem.connect();
        $('connect').innerText = 'Disconnect';
      } else {
        currentModem.disconnect();
        currentModem = null;
        $('connect').innerText = 'Connect';
      }
    });

    $('text').addEventListener('paste', function (e) {
      e.preventDefault();

      if (currentModem === null || currentModem.output === null) {
        return;
      }

      var data = (e.clipboardData || window.clipboardData).getData("text");
      console.log(data);
      currentModem.send(data,
        $('config-baud').value, $('config-data-bits').value, $('config-stop-bits').value);
    });
    $('text').addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key == 'v') {
        return; // paste
      }
      e.preventDefault();

      if (currentModem === null || currentModem.output === null) {
        return;
      }
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
        currentModem.send(keyCodes,
          $('config-baud').value, $('config-data-bits').value, $('config-stop-bits').value);
      }
    });
  });

})();
