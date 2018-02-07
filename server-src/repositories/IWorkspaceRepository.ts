import {IWorkspace, IWorkspaceVm} from '../models/Workspace';

export interface IWorkspaceRepository {
    createWorkspaceAuth(newWorkspace: IWorkspace): Promise<IWorkspaceVm>;

    updateWorkspaceAuth(id: string, updatedWorkspace: IWorkspace): Promise<IWorkspaceVm>;

    getWorkspaceByWorkspaceId(workspaceId: string): Promise<IWorkspaceVm>;
}
