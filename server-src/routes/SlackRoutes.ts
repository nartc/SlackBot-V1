import {Router} from 'express';
import {SlackController} from '../controllers/SlackController';
import {SlackWebhook} from '../helpers/slackWebhook';

export class SlackRoutes {
    router: Router;
    _slackController: SlackController;

    constructor(slackWebhook: SlackWebhook) {
        this.router = Router();
        this._slackController = new SlackController(slackWebhook);
        this.routes();
    }

    routes() {
        this.router.post('/', this._slackController.slashCommandHandler.bind(this._slackController));
        this.router.post('/actions', this._slackController.slashActionsHandler.bind(this._slackController));
    }
}
