import {Document, Model, model, Schema} from 'mongoose';

const WorkspaceSchema = new Schema({
    workspaceId: {
        type: String,
        required: true,
        unique: true
    },
    OAuthToken: {
        type: String,
        required: true
    },
    workSpaceName: String,
    createdOn: {
        type: Date,
        default: Date.now()
    }
});

export interface IWorkspace extends Document {
    workspaceId: string;
    OAuthToken: string;
    workSpaceName?: string;
    createdOn?: Date;
}

export interface IWorkspaceVm {
    workspaceId: string;
    OAuthToken: string;
    workSpaceName?: string;
    createdOn?: Date;
    _id?: string;
}

type WorkspaceModel = Model<IWorkspace>;
const Workspace: WorkspaceModel = model<IWorkspace>('Workspace', WorkspaceSchema) as WorkspaceModel;

export {WorkspaceSchema, WorkspaceModel, Workspace};
