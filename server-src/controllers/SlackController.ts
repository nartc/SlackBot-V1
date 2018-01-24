import * as config from 'config';
import {
    ActionPayload, DialogOptions, Message, SelectDialogElement, SlackDialog, SlashCommandPayload,
    TextDialogElement
} from '../models/Slack';
import {Request, Response} from 'express';
import * as request from 'request';
import {OptionsWithUri} from 'request';
import {ITeamRepository} from '../repositories/ITeamRepository';
import {TeamRepository} from '../repositories/TeamRepository';
import {ITeam, Team} from '../models/Team';
import {ITicketRepository} from '../repositories/ITicketRepository';
import {TicketRepository} from '../repositories/TicketRepository';
import {Ticket} from '../models/Ticket';
import {MongoError} from 'mongodb';

export class SlackController {
    private _teamRepository: ITeamRepository = new TeamRepository(Team);
    private _ticketRepository: ITicketRepository = new TicketRepository(Team, Ticket);
    private actionUrl: string = '';
    private actionThread: string = '';

    public async slashCommandHandler(req: Request, res: Response) {
        const responseUrl = req.body.response_url;
        const actionText = req.body.text;
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

            SlackController.sendMessageToUrl(responseUrl, message, res);
        } else {
            switch (actionText) {
                case 'init':
                    await this.resolveInitializeAction(req.body, responseUrl, res);
                    break;
                case 'ticket':
                    await this.resolveInitTicketAction(req.body, responseUrl, res);
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
                await this.resolveTicketButtonActions(actionPayload, actionResponseUrl, res);
                break;
            case 'ticket_dialog':
                break;
        }
    }

    private resolveTicketButtonActions = async (actionPayload: ActionPayload, responseUrl: string, res: Response) => {
        const actionItem = actionPayload.actions[0];
        const actionTriggerId = actionPayload.trigger_id;
        let message: Message;
        if (actionItem.value === 'no') {
            message = {
                'text': 'Ok, bye! Call me again if you need me',
                'thread_ts': this.actionThread,
                'replace_original': true,
                'delete_original': true
            };
            SlackController.sendMessageToUrl(responseUrl, message, res);
        } else if (actionItem.value === 'yes') {
            message = {
                'text': 'Alright! Please tell me more about your issue',
                'thread_ts': this.actionThread,
                'replace_original': true
            };
            SlackController.sendMessageToUrl(responseUrl, message, res);
            SlackController.openDialog(actionTriggerId);
        }
    };

    private resolveInitializeAction = async (slashCommandBody: SlashCommandPayload, responseUrl: string, res: Response) => {
        const teamId = slashCommandBody.team_id;
        const existedTeam = await this._teamRepository.getTeamByTeamIdOrName(teamId, '');

        if (existedTeam instanceof MongoError) {
            SlackController.resolveMongoError(responseUrl, res);
        } else if (existedTeam) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'init_action_error',
                        color: 'danger',
                        title: `I already initialized team ${existedTeam.teamName}`
                    }
                ]
            };

            SlackController.sendMessageToUrl(responseUrl, message, res);
        } else if (!existedTeam || existedTeam === null) {
            const newTeam: ITeam = new Team();
            newTeam.teamId = teamId;
            newTeam.teamName = slashCommandBody.channel_name;

            const result = await this._teamRepository.createTeam(newTeam);

            if (result instanceof MongoError) {
                SlackController.resolveMongoError(responseUrl, res);
            } else if (result) {
                const message: Message = {
                    text: 'Hurray',
                    replace_original: true,
                    attachments: [
                        {
                            fallback: 'Your channel does not support me',
                            callback_id: 'init_action_success',
                            color: 'good',
                            title: `Your team ${result.teamName} is ready to go`
                        }
                    ]
                };

                SlackController.sendMessageToUrl(responseUrl, message, res);
            }
        }
    };

    private resolveInitTicketAction = async (slashCommandBody: SlashCommandPayload, responseUrl: string, res: Response) => {
        const teamId = slashCommandBody.team_id;
        const existTeam = await this._teamRepository.getTeamByTeamIdOrName(teamId, '');
        let message: Message;

        if (existTeam instanceof MongoError) {
            SlackController.resolveMongoError(responseUrl, res);
        } else if ((!existTeam || existTeam === null) || (existTeam && !existTeam.isInitialized)) {
            message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'ticket_init_error',
                        color: 'danger',
                        title: `Your team has not been initialized with uTicket.`,
                        text: 'Run `/uticket init` to initialize your team',
                        mrkdwn: true
                    }
                ]
            };
        } else {
            message = {
                text: 'Opening a ticket',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'ticket_init',
                        color: 'good',
                        title: 'Are you sure to open a Support Ticket?',
                        attachment_type: 'default',
                        actions: [
                            {
                                name: 'Yes',
                                text: 'I am sure!',
                                type: 'button',
                                value: 'yes'
                            },
                            {
                                name: 'No',
                                text: 'Maybe not!',
                                type: 'button',
                                value: 'no',
                                style: 'danger'
                            }
                        ]
                    }
                ]
            };
        }
        SlackController.sendMessageToUrl(responseUrl, message, res);
    };


    private static resolveMongoError(responseUrl: string, res: Response) {
        const message: Message = {
            text: 'Error',
            replace_original: true,
            attachments: [
                {
                    fallback: 'Your channel does not support me',
                    callback_id: 'init_action_error',
                    color: 'danger',
                    title: `Error initializing Team`
                }
            ]
        };

        SlackController.sendMessageToUrl(responseUrl, message, res);
    }

    private static sendMessageToUrl(responseUrl: string, message: Message, res: Response) {
        const postOptions: OptionsWithUri = {
            uri: responseUrl,
            method: 'POST',
            json: message,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        request(postOptions, (error, response, body) => {
            if (error) {
                console.log(error);
            }

            return res.status(200).end();
        });

    }

    private static openDialog(actionTriggerId: string | undefined) {
        const ticketDialog: SlackDialog = {
            title: 'Create a Ticket',
            callback_id: 'ticket_dialog',
            elements: [
                <SelectDialogElement>{
                    label: 'Category',
                    name: 'category',
                    type: 'select',
                    placeholder: 'Please pick a category from the list',
                    options: [
                        {
                            label: 'Front-End',
                            value: 'front'
                        },
                        {
                            label: 'Back-End',
                            value: 'back'
                        },
                        {
                            label: 'APIs',
                            value: 'api'
                        },
                        {
                            label: 'Utility',
                            value: 'utility'
                        },
                        {
                            label: 'Facility',
                            value: 'facility'
                        },
                        {
                            label: 'Other',
                            value: 'other'
                        }
                    ]
                },
                <TextDialogElement>{
                    type: 'textarea',
                    label: 'Summary',
                    name: 'summary',
                    placeholder: 'Brief description of your issue',
                    max_length: 500
                }
            ]
        };

        const dialogOptions: DialogOptions = {
            trigger_id: actionTriggerId,
            dialog: ticketDialog
        };

        const dialogPostOptions: OptionsWithUri = {
            method: 'POST',
            uri: 'https://slack.com/api/dialog.open',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.get('slack.token')}`
            },
            json: dialogOptions
        };

        request(dialogPostOptions, (error, response, body) => {
           if (error) {
               console.log(error);
           }
        });
    }
}