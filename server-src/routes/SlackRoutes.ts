import {Router} from 'express';
import {SlackController} from '../controllers/SlackController';
import {SlackHelper} from '../helpers/SlackHelper';

export class SlackRoutes {
    router: Router;
    _slackController: SlackController;

    constructor(slackHelper: SlackHelper) {
        this.router = Router();
        this._slackController = new SlackController(slackHelper);
        this.routes();
    }

    routes() {
        this.router.post('/', this._slackController.slashCommandHandler.bind(this._slackController));
        this.router.post('/actions', this._slackController.slashActionsHandler.bind(this._slackController));
        this.router.get('/oauth', this._slackController.oauthHandler.bind(this._slackController));
        this.router.get('/oauth/install', this._slackController.oauthInstallHandler.bind(this._slackController));
    }
}
