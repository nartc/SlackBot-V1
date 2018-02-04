import {Document, Model, model, Schema} from 'mongoose';

const TicketSchema = new Schema({
    team: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    ticketNumber: Number,
    slug: {
        type: String,
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
    slug?: string;
    ticketNumber?: number;
    summary?: string;
    createdOn?: Date;
    isResolved?: boolean;
}

export interface ITicketVm {
    _id?: string;
    category?: string;
    slug?: string;
    ticketNumber?: number;
    summary?: string;
    createdOn?: Date;
    isResolved?: boolean;
}
// {
//     label: 'Front-End',
//         value: 'front'
// },
// {
//     label: 'Back-End',
//         value: 'back'
// },
// {
//     label: 'APIs',
//         value: 'api'
// },
// {
//     label: 'Utility',
//         value: 'utility'
// },
// {
//     label: 'Facility',
//         value: 'facility'
// },
// {
//     label: 'Other',
//         value: 'other'
// }
export const Category = {
    back: 'Back-end',
    front: 'Front-end',
    api: 'APIs',
    utility: 'Utility',
    facility: 'Facility',
    other: 'Other'
};

type TicketModel = Model<ITicket>;
const Ticket: TicketModel = model<ITicket>('Ticket', TicketSchema);

export {Ticket, TicketModel, TicketSchema};
