'use strict';

const WebSocket = require('ws');

class SocketBridgeController {
    /**
     * @param {WebSocket.Server} wss
     * @param {import('../MidiHardwareModel')} midiModel
     */
    constructor(wss, midiModel) {
        this.wss = wss;
        this.midiModel = midiModel;
    }

    initialize() {
        this.wss.on('connection', (ws, req) => this.#handleClientConnection(ws, req));
        this.midiModel.on('daw:cc', (message) => this.#broadcastToClients(message));
    }

    /**
     * @param {WebSocket} ws
     * @param {import('http').IncomingMessage} req
     */
    #handleClientConnection(ws, req) {
        const clientIp = req.socket.remoteAddress;
        console.log(`[Socket Controller] Client connected: ${clientIp}`);

        ws.on('message', (rawBuffer) => {
            try {
                const payload = JSON.parse(rawBuffer.toString());
                this.midiModel.sendMidiMessage(payload);
            } catch (err) {
                console.error(`[Socket Controller] Invalid JSON from ${clientIp}:`, err.message);
            }
        });

        ws.on('close', () => {
            console.log(`[Socket Controller] Client disconnected: ${clientIp}`);
        });
    }

    /**
     * @param {Object} message
     */
    #broadcastToClients(message) {
        const serialized = JSON.stringify(message);
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(serialized);
            }
        });
    }
}

module.exports = SocketBridgeController;