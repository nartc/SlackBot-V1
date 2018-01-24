import {Controller, Get, Path, Route} from 'tsoa';
import {IErrorResponse, IMongoError, ITicketResponse} from '../models/responses/response.index';
import {MongoError} from 'mongodb';
import {ITicketRepository} from '../repositories/ITicketRepository';
import {TicketRepository} from '../repositories/TicketRepository';
import {Ticket} from '../models/Ticket';
import {Team} from '../models/Team';

@Route('tickets')
export class TicketController extends Controller {
    private static resolveErrorResponse(error: MongoError | null, message: string): IErrorResponse {
        return {
            thrown: true,
            error: error as IMongoError,
            message
        };
    }

    private _ticketRepository: ITicketRepository = new TicketRepository(Ticket, Team);

    @Get()
    public async getTickets(): Promise<ITicketResponse[]> {
        const result = await this._ticketRepository.getTickets();

        if (result instanceof MongoError)
            throw TicketController.resolveErrorResponse(result, 'Error fetching Tickets');

        return result as ITicketResponse[];
    }

    @Get('{teamName}')
    public async getTicketsByTeam(@Path() teamName: string): Promise<ITicketResponse[]> {
        const result = await this._ticketRepository.getTicketsByTeamName(teamName);

        if (result instanceof MongoError)
            throw TicketController.resolveErrorResponse(result, 'Error fetching Tickets by Team name');

        return result as ITicketResponse[];
    }
}
