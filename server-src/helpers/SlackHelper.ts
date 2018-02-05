import * as config from 'config';
import * as moment from 'moment';
import {ITicketResponse} from '../models/responses/ITicketResponse';
import {Category, ITicket, Ticket} from '../models/Ticket';
import {
    ActionPayload, DialogOptions, Message, MessageAttachment, SelectDialogElement, SlackDialog, SlashCommandPayload,
    TextDialogElement,
    WebClientMessageAttachment
} from '../models/Slack';
import {ITeam, Team} from '../models/Team';
import * as request from 'request';
import {OptionsWithUri} from 'request';
import {Response} from 'express';
import {TicketHelper} from './TicketHelper';
import {TicketRepository} from '../repositories/TicketRepository';
import {TeamRepository} from '../repositories/TeamRepository';
import {ITeamRepository} from '../repositories/ITeamRepository';
import {ITicketRepository} from '../repositories/ITicketRepository';
import {MongoError} from 'mongodb';

const {WebClient} = require('@slack/client');

export class SlackHelper {
    _webClient;
    private _teamRepository: ITeamRepository = new TeamRepository(Team);
    private _ticketRepository: ITicketRepository = new TicketRepository(Ticket, Team);
    private slackToken: string = process.env.SLACK_TOKEN || config.get('slack.token');

    constructor() {
        this._webClient = new WebClient(this.slackToken);
    }

    public async postTicketDetail(channelId: string, ticket: ITicketResponse, team: ITeam) {
        const ts: number = moment().unix();
        const messageAttachments: WebClientMessageAttachment[] = [
            {
                fallback: 'New ticket notification',
                color: 'warning',
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
                    },
                    {
                        title: 'Status',
                        value: 'Not resolved',
                        short: true
                    },
                    {
                        title: 'Created On',
                        value: moment(ticket.createdOn).format('MMMM Do YYYY, h:mm:ss a'),
                        short: true
                    }
                ],
                mrkdwn: true,
                title: `Ticket #${ticket.ticketNumber}:`,
                text: ticket.summary
            }
        ];
        return await this._webClient.chat.postMessage(
            channelId,
            `New ticket from ${team.teamName} on ${Category[ticket.category]}`,
            {attachments: messageAttachments}
        );
    }

    public static resolveMongoError(responseUrl: string, res: Response) {
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

        SlackHelper.sendMessageToUrl(responseUrl, message, res);
    }

    public static sendMessageToUrl(responseUrl: string, message: Message, res: Response) {
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

    public static openDialog(actionTriggerId: string | undefined) {
        const ticketSelectElement: SelectDialogElement = {
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
        };

        const ticketTextElement: TextDialogElement = {
            type: 'textarea',
            label: 'Summary',
            name: 'summary',
            placeholder: 'Brief description of your issue',
            max_length: 500
        };

        const ticketDialog: SlackDialog = {
            title: 'Create a Ticket',
            callback_id: 'ticket_dialog',
            elements: [ticketSelectElement, ticketTextElement]
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
                'Authorization': `Bearer ${process.env.SLACK_TOKEN || config.get('slack.token')}`
            },
            json: dialogOptions
        };

        request(dialogPostOptions, (error, response, body) => {
            if (error) {
                console.log(error);
            }
        });
    }

    resolveTicketDialogActions = async (actionPayload: ActionPayload, responseUrl: string, res: Response) => {
        const actionItem = actionPayload.submission;
        const teamId = actionPayload.channel.id;
        const team = await this._teamRepository.getTeamByTeamIdOrName(teamId, '');

        if (team instanceof MongoError)
            SlackHelper.resolveMongoError(responseUrl, res);

        const allTicketsCount = await this._ticketRepository.getCount((team as ITeam)._id);
        const newTicket: ITicket = new Ticket();
        newTicket.team = (team as ITeam)._id;
        newTicket.category = actionItem.category;
        newTicket.ticketNumber = 1000 + allTicketsCount.valueOf();
        newTicket.slug = TicketHelper.generateTicketSlug(newTicket.ticketNumber.toString(), (team as ITeam));
        newTicket.summary = actionItem.summary;

        const result = await this._ticketRepository.createTicket(newTicket);

        if (result instanceof MongoError)
            SlackHelper.resolveMongoError(responseUrl, res);

        const message: Message = {
            replace_original: true,
            attachments: [
                {
                    text: 'You have successfully created a support ticket with ticket number `' + (result as ITicketResponse).slug + '`.\n You can later run `/uh check-ticket ticketNumber` to check your ticket.',
                    title: 'Great!',
                    fallback: 'Your channel does not support me',
                    color: 'good',
                    callback_id: 'create_ticket_success'
                }
            ]
        };

        SlackHelper.sendMessageToUrl(responseUrl, message, res);
        await this.postTicketDetail(process.env.HELPER_CHANNEL_ID || config.get('slack.helper_channel_id'), result as ITicketResponse, team as ITeam);
    };

    resolveTicketButtonActions = async (actionPayload: ActionPayload, responseUrl: string, res: Response) => {
        const actionItem = actionPayload.actions[0];
        const actionTriggerId = actionPayload.trigger_id;
        const actionThread = actionPayload.action_ts;
        let message: Message;
        if (actionItem.value === 'no') {
            message = {
                text: 'Ok, bye! Call me again if you need me',
                thread_ts: actionThread,
                replace_original: true,
                delete_original: true
            };
            SlackHelper.sendMessageToUrl(responseUrl, message, res);
        } else if (actionItem.value === 'yes') {
            message = {
                text: 'Alright! Please tell me more about your issue',
                thread_ts: actionThread,
                replace_original: true
            };
            SlackHelper.sendMessageToUrl(responseUrl, message, res);
            SlackHelper.openDialog(actionTriggerId);
        }
    };

    resolveInitializeAction = async (slashCommandBody: SlashCommandPayload, responseUrl: string, res: Response) => {
        console.log(slashCommandBody);
        const teamId = slashCommandBody.channel_id;
        const actionText = slashCommandBody.text;
        if (actionText.split(' ').length > 2) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'init_action_error',
                        color: 'danger',
                        title: `Error`,
                        text: '`team_name` should be one non-spacing string. `team_name` will later be used in your Ticket Number. We\'re sorry for any inconvenience.',
                        mrkdwn: true
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        const actionParam = actionText.split(' ')[1];
        if (!actionParam) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'init_action_error',
                        color: 'danger',
                        title: `Error`,
                        text: 'Missing parameter `team_name`',
                        mrkdwn: true
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        const existedTeam = await this._teamRepository.getTeamByTeamIdOrName(teamId, actionParam);

        if (existedTeam instanceof MongoError) {
            SlackHelper.resolveMongoError(responseUrl, res);
        } else if (existedTeam) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'init_action_error',
                        color: 'danger',
                        title: `I already initialized team ${actionParam}`
                    }
                ]
            };

            SlackHelper.sendMessageToUrl(responseUrl, message, res);
        } else if (!existedTeam || existedTeam === null) {
            const newTeam: ITeam = new Team();
            newTeam.teamId = teamId;
            newTeam.teamName = actionParam;

            const result = await this._teamRepository.createTeam(newTeam);

            if (result instanceof MongoError) {
                SlackHelper.resolveMongoError(responseUrl, res);
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

                SlackHelper.sendMessageToUrl(responseUrl, message, res);
            }
        }
    };

    resolveInitTicketAction = async (slashCommandBody: SlashCommandPayload, responseUrl: string, res: Response) => {
        const teamId = slashCommandBody.channel_id;
        const existTeam = await this._teamRepository.getTeamByTeamIdOrName(teamId, '');
        let message: Message;

        if (existTeam instanceof MongoError) {
            SlackHelper.resolveMongoError(responseUrl, res);
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
                        text: 'Run `/uh init team_name` to initialize your team',
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
        SlackHelper.sendMessageToUrl(responseUrl, message, res);
    };

    resolveTicketResolveAction = async (slashCommandPayload: SlashCommandPayload, responseUrl: string, res: Response) => {
        const actionText = slashCommandPayload.text;
        const teamId = slashCommandPayload.channel_id;
        const helperTeamId = process.env.HELPER_CHANNEL_ID || config.get('slack.helper_channel_id');
        if (teamId !== helperTeamId) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'resolve_ticket_action_error',
                        color: 'danger',
                        title: 'Your team is not authorized to run `resolve` command.'
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        if (actionText.split(' ').length > 2) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'resolve_ticket_action_error',
                        color: 'danger',
                        title: `Error`,
                        text: '`ticket_number` should be a one non-spacing string. E.g: Team1_1000. We are sorry for any inconvenience.',
                        mrkdwn: true
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        const ticketSlug = actionText.split(' ')[1];
        if (!ticketSlug) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'resolve_ticket_action_error',
                        color: 'danger',
                        title: `Error`,
                        text: 'Missing parameter `ticket_number`',
                        mrkdwn: true
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        const ticket = await this._ticketRepository.getTicketBySlug(ticketSlug);
        if (ticket instanceof MongoError) {
            SlackHelper.resolveMongoError(responseUrl, res);
        } else if (!ticket || ticket === (null || undefined)) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'resolve_ticket_action_error',
                        color: 'danger',
                        title: `Ticket ${ticketSlug} is unavailable or is not existed. Please try again.`
                    }
                ]
            };

            SlackHelper.sendMessageToUrl(responseUrl, message, res);
        } else {
            const updatedTicket: ITicket = new Ticket();
            updatedTicket.ticketNumber = ticket.ticketNumber;
            updatedTicket._id = ticket._id;
            updatedTicket.category = ticket.category;
            updatedTicket.team = ticket.team._id;
            updatedTicket.createdOn = ticket.createdOn;
            updatedTicket.summary = ticket.summary;
            updatedTicket.isResolved = true;

            const result = await this._ticketRepository.updateTicket(ticket._id, updatedTicket);
            if (result instanceof MongoError) {
                SlackHelper.resolveMongoError(responseUrl, res);
            } else {
                const message: Message = {
                    replace_original: true,
                    attachments: [
                        {
                            title: `Ticket ${result.ticketNumber} has been resolved.`,
                            fallback: 'Your channel does not support me',
                            color: 'good',
                            callback_id: 'resolve_ticket_action_success',
                            footer: 'UMSL|Hack',
                            footer_icon: 'https://pbs.twimg.com/profile_images/578748164708179968/QHEcJBWu_400x400.jpeg',
                            ts: moment().unix(),
                            text: result.summary,
                            fields: [
                                {
                                    title: 'By team',
                                    value: result.team.teamName,
                                    short: true
                                },
                                {
                                    title: 'Category',
                                    value: Category[result.category],
                                    short: true
                                },
                                {
                                    title: 'Status',
                                    value: 'Resolved',
                                    short: true
                                },
                                {
                                    title: 'Created On',
                                    value: moment(result.createdOn).format('MMMM Do YYYY, h:mm:ss a'),
                                    short: true
                                }
                            ]
                        }
                    ]
                };

                SlackHelper.sendMessageToUrl(responseUrl, message, res);
            }
        }
    };

    resolveCheckTicketAction = async (slashCommandPayload: SlashCommandPayload, responseUrl: string, res: Response) => {
        const teamId = slashCommandPayload.channel_id;
        const actionText = slashCommandPayload.text;
        const helperChannelId = process.env.HELPER_CHANNEL_ID || config.get('slack.helper_channel_id');

        if (actionText.split(' ').length > 2) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'check_ticket_action_success',
                        color: 'danger',
                        title: `Error`,
                        text: '`ticket_number` should be a one non-spacing string. E.g: Team1_1000. We are sorry for any inconvenience.',
                        mrkdwn: true
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        const ticketSlug = actionText.split(' ')[1];
        if (!ticketSlug) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'check_ticket_action_success',
                        color: 'danger',
                        title: `Error`,
                        text: 'Missing parameter `ticket_number`',
                        mrkdwn: true
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        const ticket = await this._ticketRepository.getTicketBySlug(ticketSlug);
        if (ticket instanceof MongoError) {
            SlackHelper.resolveMongoError(responseUrl, res);
        } else if (!ticket || ticket === (null || undefined)) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'check_ticket_action_success',
                        color: 'danger',
                        title: `Ticket ${ticketSlug} is unavailable or is not existed. Please try again.`
                    }
                ]
            };

            SlackHelper.sendMessageToUrl(responseUrl, message, res);
        } else if (teamId !== ticket.team.teamId && teamId !== helperChannelId) {
            const message: Message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'check_ticket_action_success',
                        color: 'danger',
                        title: 'Your team is not authorized to run `check-ticket` command on Ticket Numbers that are not yours.'
                    }
                ]
            };

            SlackHelper.sendMessageToUrl(responseUrl, message, res);
        } else {
            const message: Message = {
                replace_original: true,
                attachments: [
                    {
                        title: `Ticket ${ticket.ticketNumber}:`,
                        fallback: 'Your channel does not support me',
                        color: ticket.isResolved ? 'good' : 'warning',
                        callback_id: 'check_ticket_action_success',
                        footer: 'UMSL|Hack',
                        footer_icon: 'https://pbs.twimg.com/profile_images/578748164708179968/QHEcJBWu_400x400.jpeg',
                        ts: moment().unix(),
                        text: ticket.summary,
                        fields: [
                            {
                                title: 'By team',
                                value: ticket.team.teamName,
                                short: true
                            },
                            {
                                title: 'Category',
                                value: Category[ticket.category],
                                short: true
                            },
                            {
                                title: 'Status',
                                value: ticket.isResolved ? 'Resolved' : 'Not resolved',
                                short: true
                            },
                            {
                                title: 'Created On',
                                value: moment(ticket.createdOn).format('MMMM Do YYYY, h:mm:ss a'),
                                short: true
                            }
                        ]
                    }
                ]
            };

            SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }
    };

    resolveListAllTicketsAction = async (slashCommandPayload: SlashCommandPayload, responseUrl: string, res: Response) => {
        const teamId = slashCommandPayload.channel_id;
        const helperChannelId = process.env.HELPER_CHANNEL_ID || config.get('slack.helper_channel_id');
        if (teamId === helperChannelId) {
            const message: Message = {
                replace_original: true,
                response_type: 'in_channel',
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'list_all_action_error',
                        color: 'danger',
                        title: `I guess you guys are just bored. I would advise going around checking on the teams. Thanks. ¯\\_(ツ)_/¯ `
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        const team = await this._teamRepository.getTeamByTeamIdOrName(teamId, '');
        let message: Message;
        if (team instanceof MongoError) {
            return SlackHelper.resolveMongoError(responseUrl, res);
        }

        if ((!team || team === null) || (team && !team.isInitialized)) {
            message = {
                text: 'Error',
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'list_all_action_error',
                        color: 'danger',
                        title: `Your team has not been initialized with uTicket.`,
                        text: 'Run `/uh init team_name` to initialize your team',
                        mrkdwn: true
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        const tickets = await this._ticketRepository.getTicketsByTeamName(team.teamName);

        if (tickets instanceof MongoError) {
            return SlackHelper.resolveMongoError(responseUrl, res);
        }

        if (tickets.length === 0) {
            message = {
                replace_original: true,
                attachments: [
                    {
                        fallback: 'Your channel does not support me',
                        callback_id: 'list_all_action_error',
                        color: 'warning',
                        title: 'Your team has not opened any ticket.',
                        text: 'Run `/uh ticket` if you wish to open a ticket.',
                        mrkdwn: true
                    }
                ]
            };

            return SlackHelper.sendMessageToUrl(responseUrl, message, res);
        }

        message = {
            replace_original: true,
            delete_original: true
        };
        let attachments: MessageAttachment[] = [];
        tickets.forEach(ticket => {
            const attachment: MessageAttachment = {
                fallback: 'Your channel does not support me',
                callback_id: 'list_all_action_error',
                color: ticket.isResolved ? 'good' : 'warning',
                title: `${ticket.ticketNumber}: ${ticket.isResolved ? 'Resolved' : 'Not resolved'}`,
                text: 'Use `/uh check-ticket ' + ticket.slug + '` to check the ticket detail',
                mrkdwn: true
            };
            attachments.push(attachment);
        });

        message.attachments = attachments;
        message.response_type = 'in_channel';
        SlackHelper.sendMessageToUrl(responseUrl, message, res);
    }
}