import {ITeamVm} from '../Team';

export interface ITicketResponse {
    _id?: string;
    category?: string;
    summary?: string;
    ticketNumber?: number;
    slug?: string;
    createdOn?: Date;
    isResolved?: boolean;
    team?: ITeamVm;
}
