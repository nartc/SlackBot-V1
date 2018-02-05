import {ActionPayload, Message, SlashCommandPayload} from '../models/Slack';
import {Request, Response} from 'express';
import {SlackHelper} from '../helpers/SlackHelper';

export class SlackController {

    private actionUrl: string = '';
    private actionThread: string = '';
    private _slackHelper: SlackHelper;

    constructor(slackHelper: SlackHelper) {
        this._slackHelper = slackHelper;
    }

    public async slashCommandHandler(req: Request, res: Response) {
        const slashCommandPayload = req.body as SlashCommandPayload;
        const responseUrl = slashCommandPayload.response_url;
        const actionText = slashCommandPayload.text.split(' ')[0];
        if (!actionText || actionText === '') {
            const message: Message = {
                text: 'You need to provide a valid command parameter.',
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'init_action',
                        color: 'warning',
                        title: 'No valid command provided'
                    }
                ]
            };

            SlackHelper.sendMessageToUrl(responseUrl, message, res);
        } else {
            switch (actionText) {
                case 'init':
                    await this._slackHelper.resolveInitializeAction(slashCommandPayload, responseUrl, res);
                    break;
                case 'ticket':
                    await this._slackHelper.resolveInitTicketAction(slashCommandPayload, responseUrl, res);
                    break;
                case 'resolve':
                    await this._slackHelper.resolveTicketResolveAction(slashCommandPayload, responseUrl, res);
                    break;
                case 'check-ticket':
                    await this._slackHelper.resolveCheckTicketAction(slashCommandPayload, responseUrl, res);
                    break;
                case 'list-all':
                    await this._slackHelper.resolveListAllTicketsAction(slashCommandPayload, responseUrl, res);
                    break;
                default:
                    break;
            }
        }
    }

    public async slashActionsHandler(req: Request, res: Response) {
        const actionPayload: ActionPayload = JSON.parse(req.body.payload) as ActionPayload;
        const actionId = actionPayload.callback_id;
        const actionResponseUrl = actionPayload.response_url;
        this.actionUrl = actionResponseUrl ? actionResponseUrl : this.actionUrl;
        this.actionThread = actionPayload.action_ts;

        // const actionItem = actionPayload.actions ? actionPayload.actions[0] : actionPayload.submission;
        // const actionTriggerId = actionPayload.trigger_id ? actionPayload.trigger_id : '';

        switch (actionId) {
            case 'ticket_init':
                await this._slackHelper.resolveTicketButtonActions(actionPayload, actionResponseUrl, res);
                break;
            case 'ticket_dialog':
                await this._slackHelper.resolveTicketDialogActions(actionPayload, this.actionUrl, res);
                break;
        }
    }
}
