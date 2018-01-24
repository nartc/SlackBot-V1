import {ITeam} from '../models/Team';
import {MongoError} from 'mongodb';

export interface ITeamRepository {
    getTeams(): Promise<ITeam[] | MongoError>;
    createTeam(newTeam: ITeam): Promise<ITeam | MongoError>;
    updateTeam(teamId: string, updatedTeam: ITeam): Promise<ITeam | null | MongoError>;
    getTeamByTeamIdOrName(teamId?: string, teamName?: string): Promise<ITeam | null | MongoError>;
}
