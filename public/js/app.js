import { ControllerStateModel } from './models/ControllerStateModel.js';
import { ControlSurfaceView } from './views/ControlSurfaceView.js';
import { ModalView } from './views/ModalView.js';
import { MidiClientController } from './controllers/MidiClientController.js';

document.addEventListener('DOMContentLoaded', () => {
    const model = new ControllerStateModel();
    const surfaceView = new ControlSurfaceView();
    const modalView = new ModalView();

    const controller = new MidiClientController(model, surfaceView, modalView);
    controller.initialize();
});