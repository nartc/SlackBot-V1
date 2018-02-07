import {ITicketResponse} from '../models/responses/ITicketResponse';
import {MongoError} from 'mongodb';
import {ITicket} from '../models/Ticket';

export interface ITicketRepository {
    getTickets(): Promise<ITicketResponse[] | MongoError>;

    getTicketsByTeamName(teamName: string): Promise<ITicketResponse[] | MongoError>;

    createTicket(newTicket: ITicket): Promise<ITicketResponse | MongoError>;

    updateTicket(id: string, updatedTicket: ITicket): Promise<ITicketResponse | MongoError>;

    getCount(team: string): Promise<Number>;

    getTicketBySlug(slug: string): Promise<ITicketResponse>;
}
