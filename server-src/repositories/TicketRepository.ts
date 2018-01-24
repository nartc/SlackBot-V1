import {ITicketRepository} from './ITicketRepository';
import {ITicket, TicketModel} from '../models/Ticket';
import {ITicketResponse} from '../models/responses/response.index';
import {MongoError} from 'mongodb';
import {TeamModel} from '../models/Team';

export class TicketRepository implements ITicketRepository {
    private _ticketModel: TicketModel;
    private _teamModel: TeamModel;

    constructor(ticketModel: TicketModel, teamModel: TeamModel) {
        this._ticketModel = ticketModel;
        this._teamModel = teamModel;
    }

    public async getTickets(): Promise<ITicketResponse[] | MongoError> {
        return await this._ticketModel.find().populate('team') as ITicketResponse[];
    }

    public async getTicketsByTeamName(teamName: string): Promise<ITicketResponse[] | MongoError> {
        const teamQuery = {teamName};
        const team = await this._teamModel.findOne(teamQuery);

        const query = {team: team ? team._id : ''};
        return await this._ticketModel.find(query) as ITicketResponse[];
    }

    public async createTicket(newTicket: ITicket, teamName: string): Promise<ITicketResponse | MongoError> {
        const teamQuery = {teamName};
        const team = await this._teamModel.findOne(teamQuery);

        newTicket.team = team ? team._id : null;
        return await this._ticketModel.create(newTicket) as ITicketResponse;
    }

    public async updateTicket(id: string, updatedTicket: ITicket): Promise<ITicketResponse | MongoError> {
        return await this._ticketModel.findByIdAndUpdate(id, updatedTicket) as ITicketResponse;
    }

}