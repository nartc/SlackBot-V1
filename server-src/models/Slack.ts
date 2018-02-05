export interface SlashCommandPayload {
    response_url: string;
    team_id: string;
    token?: string;
    team_domain?: string;
    enterprise_id?: string;
    enterprise_name?: string;
    channel_id?: string;
    channel_name?: string;
    user_id?: string;
    user_name?: string;
    command?: string;
    text?: string;
    trigger_id?: string;
}

export interface ActionPayload {
    actions?: Action[];
    callback_id?: string;
    team?: Team;
    channel?: Channel;
    user?: User;
    action_ts?: string;
    message_ts?: string;
    attachment_id?: string;
    token?: string;
    original_message?: string;
    response_url?: string;
    submission?: Submission;
    trigger_id?: string;
}

export interface SlackDialog {
    title: string;
    callback_id: string;
    elements: TextDialogElement[] | SelectDialogElement[];
    submit_label?: string;
}

export interface DialogOptions {
    trigger_id: string;
    dialog: SlackDialog;
}

interface DialogElement {
    label: string;
    name: string;
    type: 'text' | 'textarea' | 'select';
    placeholder?: string;
    value?: string;
    optional?: boolean;
}

export interface TextDialogElement extends DialogElement {
    max_length?: number;
    min_length?: number;
    hint?: string;
    subtype?: 'email' | 'number' | 'tel' | 'url';
}

export interface SelectDialogElement extends DialogElement {
    options?: SelectElementOption[];
}

interface SelectElementOption {
    label: string;
    value: string;
}

interface Submission {
    [key: string]: string;
    value?: string;
}

interface Team {
    id?: string;
    domain?: string;
}

interface Channel {
    id?: string;
    name?: string;
}

interface User {
    id?: string;
    name?: string;
}

interface Action {
    name?: string;
    value?: string;
    type?: string;
    selected_options?: MenuMessageOption[]
}

export interface Message {
    text?: string;
    attachments?: MessageAttachment[];
    thread_ts?: string;
    response_type?: string;
    replace_original?: boolean;
    delete_original?: boolean;
}

interface Attachment {
    fallback: string;
    text?: string;
    pretext?: string;
    mrkdwn?: boolean;
    fields?: [{
        title?: string;
        value?: string;
        short?: boolean;
    }];
    ts?: number;
    footer?: string;
    footer_icon?: string;
    author_name?: string;
    author_link?: string;
    author_icon?: string;
    color?: string;
    title?: string;
}

export interface MessageAttachment extends Attachment{
    callback_id: string;
    actions?: MessageAction[];
    attachment_type?: string;
}

export interface WebClientMessageAttachment extends Attachment{
    title_link?: string;
    text?: string;
    image_url?: string;
    thumb_url?: string;
}

export interface MessageAction {
    name: string;
    text: string;
    type: 'button' | 'select';
    value?: string;
    confirm?: MessageConfirm;
    style?: 'default' | 'primary' | 'danger';
    options?: MenuMessageOption[];
    option_groups?: MenuMessageOptionGroup[];
    data_source?: 'static' | 'users' | 'channels' | 'conversations' | 'external';
    selected_options?: MenuMessageOption[];
    min_query_length?: number;
}

interface MessageConfirm {
    text: string;
    title?: string;
    ok_text?: string;
    dismiss_text?: string;
}

interface MenuMessageOption {
    text: string;
    value: string;
    description?: string;
}

interface MenuMessageOptionGroup {
    text: string;
    options: MenuMessageOption[];
}
