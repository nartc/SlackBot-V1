import {ITeam} from '../models/Team';

export class TicketHelper {

    static generateTicketSlug(ticketNumberAsString: string, team: ITeam): string {
        const tempArr = [];
        tempArr.push(team.teamName, ticketNumberAsString);
        return tempArr.join('_');
    }
}