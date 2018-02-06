import {IWorkspaceRepository} from './IWorkspaceRepository';
import {IWorkspace, IWorkspaceVm, WorkspaceModel} from '../models/Workspace';

export class WorkspaceRepository implements IWorkspaceRepository {

    private _workspaceModel: WorkspaceModel;

    constructor(workspaceModel: WorkspaceModel) {
        this._workspaceModel = workspaceModel;
    }

    public async createWorkspaceAuth(newWorkspace: IWorkspace): Promise<IWorkspaceVm> {
        return await this._workspaceModel.create(newWorkspace);
    }

    public async updateWorkspaceAuth(id: string, updatedWorkspace: IWorkspace): Promise<IWorkspaceVm> {
        return await this._workspaceModel.findByIdAndUpdate(id, updatedWorkspace);
    }

    public async getWorkspaceByWorkspaceId(workspaceId: string): Promise<IWorkspaceVm> {
        const query = {workspaceId};
        return await this._workspaceModel.findOne(query);
    }
}