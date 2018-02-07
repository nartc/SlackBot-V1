import {ITeamRepository} from './ITeamRepository';
import {ITeam, TeamModel} from '../models/Team';
import {MongoError} from 'mongodb';

export class TeamRepository implements ITeamRepository {
    private _teamModel: TeamModel;

    constructor(teamModel: TeamModel) {
        this._teamModel = teamModel;
    }

    public async getTeams(): Promise<ITeam[] | MongoError> {
        return await this._teamModel.find();
    }

    public async createTeam(newTeam: ITeam): Promise<ITeam | MongoError> {
        return await this._teamModel.create(newTeam);
    }

    public async getTeamByTeamIdOrName(teamId?: string, teamName?: string): Promise<ITeam | null | MongoError> {
        const query = {$or: [{teamId}, {teamName}]};
        return await this._teamModel.findOne(query);
    }

    public async updateTeam(teamId: string, updatedTeam: ITeam): Promise<ITeam | null | MongoError> {
        const query = {teamId};
        return await this._teamModel.findOneAndUpdate(query, updatedTeam);
    }
}
