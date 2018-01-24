import {Router} from 'express';
import {SlackController} from '../controllers/SlackController';

export class SlackRoutes {
    router: Router;
    _slackController: SlackController;

    constructor() {
        this.router = Router();
        this._slackController = new SlackController();
        this.routes();
    }

    routes() {
        this.router.post('/', this._slackController.slashCommandHandler.bind(this._slackController));
        this.router.post('/actions', this._slackController.slashActionsHandler.bind(this._slackController));
    }
}
