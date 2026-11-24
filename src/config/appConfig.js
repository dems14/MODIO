"use strict";

const os = require("os");
const path = require("path");

function resolveLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const ifaceList of Object.values(interfaces)) {
    for (const iface of ifaceList) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const appConfig = Object.freeze({
  port: Number(process.env.PORT) || 3000,
  host: "0.0.0.0",
  midiOutPortName: process.env.MIDI_OUT_PORT || "MODIO To DAW",
  midiInPortName: process.env.MIDI_IN_PORT || "MODIO From DAW",
  publicDir: path.join(__dirname, "..", "..", "public"),
  localIp: resolveLocalIp(),
});

module.exports = appConfig;
