import {MongoError} from 'mongodb';
import {ITeamVm, Team} from '../models/Team';
import {ITeamRepository} from '../repositories/ITeamRepository';
import {TeamRepository} from '../repositories/TeamRepository';
import {Controller, Get, Route, Tags} from 'tsoa';
import {IErrorResponse, IMongoError} from '../models/responses/response.index';

@Route('teams')
@Tags('Operations')
export class TeamController extends Controller {
    private _teamRepository: ITeamRepository = new TeamRepository(Team);

    private static resolveErrorResponse(error: MongoError | null, message: string): IErrorResponse {
        return {
            thrown: true,
            error: error as IMongoError,
            message
        };
    }

    @Get()
    public async getTeams(): Promise<ITeamVm[]> {
        const result = await this._teamRepository.getTeams();

        if (result instanceof MongoError)
            throw TeamController.resolveErrorResponse(result, 'Error fetching Teams');

        return result as ITeamVm[];
    }
}
