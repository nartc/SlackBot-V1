import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import {Application, Request, Response} from 'express';
import * as mongoose from 'mongoose';
import {Connection, Mongoose} from 'mongoose';
import * as logger from 'morgan';
import * as config from 'config';
import * as path from 'path';

import {logger as winston, setupLogging} from './helpers/WinstonLogger';
import {MongoError} from 'mongodb';
import {SlackRoutes} from './routes/SlackRoutes';

import './controllers/TeamController';
import './controllers/TicketController';
import './controllers/SystemController';
import {RegisterRoutes} from './routes/routes';
import {SlackHelper} from './helpers/SlackHelper';
import {SwaggerRouter} from './helpers/Swagger';
import {authenticateUser} from './helpers/Passport';
import * as passport from 'passport';
import {initialize, session} from 'passport';


class App {
    public app: Application;
    public mongooseConnection: Connection;
    private _slackWebhook: SlackHelper = new SlackHelper();
    private _slackRoutes: SlackRoutes = new SlackRoutes(this._slackWebhook);
    private environmentHosting: string = process.env.NODE_ENV || 'Development';
    private _swagger: SwaggerRouter = new SwaggerRouter();

    constructor() {
        this.app = express();
        setupLogging(this.app);
        this.configure();
        this.routes();
    }

    private configure(): void {
        // Connect to MongoDB
        (mongoose as Mongoose).Promise = global.Promise;

        mongoose.connect(process.env.MONGO_URI || config.get('mongo.mongo_uri'));
            // .then(this.onMongoConnection)
            // .catch(this.onMongoError);
        this.mongooseConnection = mongoose.connection;
        this.mongooseConnection.on('connected', this.onMongoConnection);
        this.mongooseConnection.on('error', this.onMongoError);
        // CORS MW
        this.app.use(cors());
        this.app.options('*', cors());

        // Morgan MW
        this.app.use(logger('dev'));

        // BodyParser MW
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));

        // Passport MW
        authenticateUser(passport);
        this.app.use(initialize());
        this.app.use(session());

        // Import Slack Routes
        this._slackRoutes.routes();

    }

    private routes() {
        RegisterRoutes(this.app);
        this.app.use('/api/slack', this._slackRoutes.router);
        // SwaggerUI
        this.app.use('/', this._swagger.getRouter());
        this.app.use('/api/docs', express.static(path.join(__dirname, '../server-src/documentation/swagger-ui')));
        // Index for Pinging
        this.app.get('/', (req: Request, res: Response) => {
           res.send('Welcome to uTicket Bot');
        });
    }

    private onMongoConnection() {
        winston.info(
            `-------------
       Connected to Database
      `
        );
    }

    private onMongoError(error: MongoError) {
        winston.error(
            `-------------
       Error on connection to database: ${error}
      `
        );
    }
}

export default new App();