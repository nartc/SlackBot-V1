import {Document, Model, model, Schema} from 'mongoose';

const TicketSchema = new Schema({
    team: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    category: String,
    summary: String,
    createdOn: {
        type: Date,
        default: Date.now()
    },
    isResolved: {
        type: Boolean,
        default: false
    }
});

export interface ITicket extends Document {
    team?: string;
    category?: string;
    summary?: string;
    createdOn?: Date;
    isResolved?: boolean;
}

export interface ITicketVm {
    _id?: string;
    category?: string;
    summary?: string;
    createdOn?: Date;
    isResolved?: boolean;
}

type TicketModel = Model<ITicket>;
const Ticket: TicketModel = model<ITicket>('Ticket', TicketSchema);

export {Ticket, TicketModel, TicketSchema};