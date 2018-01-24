import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import {Application} from 'express';
import * as mongoose from 'mongoose';
import {Mongoose} from 'mongoose';
import * as logger from 'morgan';
import * as config from 'config';

import {logger as winston, setupLogging} from './helpers/logger';
import {MongoError} from 'mongodb';
import {SlackRoutes} from './routes/SlackRoutes';

import './controllers/TeamController';
import './controllers/TicketController';
import {RegisterRoutes} from './routes/routes';

class App {
    public app: Application;
    private _slackRoutes: SlackRoutes = new SlackRoutes();
    private environmentHosting: string = process.env.NODE_ENV || 'Development';

    constructor() {
        this.app = express();
        setupLogging(this.app);
        this.configure();
        this.routes();
    }

    private configure(): void {
        // Connect to MongoDB
        (mongoose as Mongoose).Promise = global.Promise;

        mongoose
            .connect(process.env.MONGO_URI || config.get('mongo.mongo_uri'))
            .then(this.onMongoConnection)
            .catch(this.onMongoError);

        // CORS MW
        this.app.use(cors());
        this.app.options('*', cors());

        // Morgan MW
        this.app.use(logger('dev'));

        // BodyParser MW
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));

        // Import Slack Routes
        this._slackRoutes.routes();
        RegisterRoutes(this.app);
    }

    private routes() {
        this.app.use('/api/slack', this._slackRoutes.router);
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

export default new App().app;