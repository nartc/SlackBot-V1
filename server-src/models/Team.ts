import {Document, Model, model, Schema} from 'mongoose';

const TeamSchema = new Schema({
    teamName: String,
    teamId: String,
    isInitialized: {
        type: Boolean,
        default: true
    }
});

export interface ITeam extends Document {
    teamName?: string;
    teamId?: string;
    isInitialized?: boolean;
}

export interface ITeamVm {
    teamName?: string;
    teamId?: string;
    isInitialized?: boolean;
    _id?: string;
}

type TeamModel = Model<ITeam>;
const Team: TeamModel = model<ITeam>('Team', TeamSchema) as TeamModel;

export {TeamSchema, TeamModel, Team};