"use strict";

const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const appConfig = require("./src/config/appConfig");
const MidiHardwareModel = require("./src/models/MidiHardwareModel");
const SocketBridgeController = require("./src/controllers/SocketBridgeController");

function bootstrap() {
  const app = express();
  const httpServer = http.createServer(app);
  const wss = new WebSocket.Server({ server: httpServer });

  app.use(express.static(appConfig.publicDir));
  const midiModel = new MidiHardwareModel(
    appConfig.midiOutPortName,
    appConfig.midiInPortName,
  );
  try {
    midiModel.initialize();
  } catch (err) {
    console.error(`[Fatal Error] ${err.message}`);
    process.exit(1);
  }

  const bridgeController = new SocketBridgeController(wss, midiModel);
  bridgeController.initialize();

  httpServer.listen(appConfig.port, appConfig.host, () => {
    console.log("==================================================");
    console.log(" Wi-Fi MIDI Controller Server Running");
    console.log(
      ` Open on tablet/phone: http://${appConfig.localIp}:${appConfig.port}`,
    );
    console.log("==================================================");
  });

  process.on("SIGINT", () => {
    midiModel.close();
    process.exit(0);
  });
}

bootstrap();
