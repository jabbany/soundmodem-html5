# soundmodem-html5

This repository implements a modem using HTML5 Audio APIs. This allows you to interface with old devices that use acoustic modems. For signal integrity, we recommend that you connect audio directly to the device.

## Supported Signaling

FSK:
- Bell 103 (300 baud): Originating and Answering modes.
- Bell 202 (1200 baud)

PSK:

Other:
- DTMF
- RTTY

## Supported Handshakes

- None
- Bell 103 Carrier
- V.8 (Call and Answer)
