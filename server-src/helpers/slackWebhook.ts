import * as config from 'config';
import * as moment from 'moment';

const {IncomingWebhook, WebClient} = require('@slack/client');
import {ITicketResponse} from '../models/responses/ITicketResponse';
import {Category} from '../models/Ticket';
import {WebClientMessageAttachment} from '../models/Slack';
import {ITeam} from '../models/Team';

export class SlackWebhook {
    _incomingWebhook;
    _webClient;
    private helperWebhookURL: string = process.env.HELPER_WEBHOOK_URL || config.get('slack.helper_webhook_url');
    private slackToken: string = process.env.SLACK_TOKEN || config.get('slack.token');

    constructor() {
        this._incomingWebhook = new IncomingWebhook(this.helperWebhookURL);
        this._webClient = new WebClient(this.slackToken);
    }

    public async newTicketNotification() {
        return await this._incomingWebhook.send('New ticket created. Details below')
    }

    public async postTicketDetail(channelId: string, ticket: ITicketResponse, team: ITeam) {
        const ts: number = moment().unix();
        const messageAttachments: WebClientMessageAttachment[] = [
            {
                fallback: 'New ticket notification',
                color: 'good',
                footer: 'UMSL|Hack',
                footer_icon: 'https://pbs.twimg.com/profile_images/578748164708179968/QHEcJBWu_400x400.jpeg',
                ts,
                fields: [
                    {
                        title: 'By team',
                        value: team.teamName,
                        short: true
                    },
                    {
                        title: 'Category',
                        value: Category[ticket.category],
                        short: true
                    }
                ],
                mrkdwn: true,
                title: `*Ticket #${ticket.ticketNumber}`,
                text: ticket.summary
            }
        ];
        return await this._webClient.chat.postMessage(channelId, 'New Ticket', {attachments: messageAttachments});
    }
}