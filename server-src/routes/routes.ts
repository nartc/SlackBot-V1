/* tslint:disable */
import {Controller, FieldErrors, TsoaRoute, ValidateError, ValidateParam} from 'tsoa';
import {TeamController} from './../controllers/TeamController';
import {TicketController} from './../controllers/TicketController';
import {SystemController} from './../controllers/SystemController';
import * as passport from 'passport';

const models: TsoaRoute.Models = {
    'ITeamVm': {
        'properties': {
            'teamName': {'dataType': 'string'},
            'teamId': {'dataType': 'string'},
            'isInitialized': {'dataType': 'boolean'},
            '_id': {'dataType': 'string'},
        },
    },
    'ITicketResponse': {
        'properties': {
            '_id': {'dataType': 'string'},
            'category': {'dataType': 'string'},
            'summary': {'dataType': 'string'},
            'ticketNumber': {'dataType': 'double'},
            'slug': {'dataType': 'string'},
            'createdOn': {'dataType': 'datetime'},
            'isResolved': {'dataType': 'boolean'},
            'team': {'ref': 'ITeamVm'},
        },
    },
    'ISystemAuthResponse': {
        'properties': {
            'authToken': {'dataType': 'string', 'required': true},
        },
    },
    'IAuthLoginParams': {
        'properties': {
            'nick': {'dataType': 'string', 'required': true},
            'pass': {'dataType': 'string', 'required': true},
        },
    },
};

export function RegisterRoutes(app: any) {
    app.get('/api/teams',
        function (request: any, response: any, next: any) {
            const args = {};

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new TeamController();


            const promise = controller.getTeams.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/tickets',
        function (request: any, response: any, next: any) {
            const args = {};

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new TicketController();


            const promise = controller.getTickets.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/tickets/:teamName',
        function (request: any, response: any, next: any) {
            const args = {
                teamName: {'in': 'path', 'name': 'teamName', 'required': true, 'dataType': 'string'},
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new TicketController();


            const promise = controller.getTicketsByTeam.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.post('/api/auth/auth',
        function (request: any, response: any, next: any) {
            const args = {
                loginParams: {'in': 'body', 'name': 'loginParams', 'required': true, 'ref': 'IAuthLoginParams'},
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new SystemController();


            const promise = controller.adminAuth.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/auth/clear/:collection',
        authenticateMiddleware('jwt'),
        function (request: any, response: any, next: any) {
            const args = {
                expressRequest: {'in': 'request', 'name': 'expressRequest', 'required': true, 'dataType': 'object'},
                collection: {'in': 'path', 'name': 'collection', 'required': true, 'dataType': 'string'},
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new SystemController();


            const promise = controller.clearDatabase.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });

    function authenticateMiddleware(strategy: string) {
        return passport.authenticate(strategy, {session: false});
    }

    function promiseHandler(controllerObj: any, promise: any, response: any, next: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                let statusCode;
                if (controllerObj instanceof Controller) {
                    const controller = controllerObj as Controller
                    const headers = controller.getHeaders();
                    Object.keys(headers).forEach((name: string) => {
                        response.set(name, headers[name]);
                    });

                    statusCode = controller.getStatus();
                }

                if (data) {
                    response.status(statusCode || 200).json(data);
                } else {
                    response.status(statusCode || 204).end();
                }
            })
            .catch((error: any) => response.status(500).json(error));
    }

    function getValidatedArgs(args: any, request: any): any[] {
        const errorFields: FieldErrors = {};
        const values = Object.keys(args).map(function (key) {
            const name = args[key].name;
            switch (args[key].in) {
                case 'request':
                    return request;
                case 'query':
                    return ValidateParam(args[key], request.query[name], models, name, errorFields);
                case 'path':
                    return ValidateParam(args[key], request.params[name], models, name, errorFields);
                case 'header':
                    return ValidateParam(args[key], request.header(name), models, name, errorFields);
                case 'body':
                    return ValidateParam(args[key], request.body, models, name, errorFields);
                case 'body-prop':
                    return ValidateParam(args[key], request.body[name], models, name, errorFields);
            }
        });

        if (Object.keys(errorFields).length > 0) {
            throw new ValidateError(errorFields, '');
        }
        return values;
    }
}