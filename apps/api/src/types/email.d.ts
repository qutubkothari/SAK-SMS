declare module 'imapflow' {
  export class ImapFlow {
    constructor(options: {
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
      logger?: boolean | any;
      disableCompression?: boolean;
      disableAutoEnable?: boolean;
      tls?: any;
    });
    connect(): Promise<void>;
    logout(): Promise<void>;
    mailboxOpen(path: string): Promise<any>;
    fetch(
      range: string,
      options: { envelope?: boolean; source?: boolean; flags?: boolean }
    ): AsyncIterable<{
      seq: number;
      uid: number;
      source: Buffer;
      flags?: Set<string>;
      envelope?: any;
    }>;
    messageFlagsAdd(seq: number | string, flags: string[]): Promise<void>;
    getMailboxLock(path: string): Promise<{ release: () => void }>;
    idle(): Promise<void>;
    on(event: string, handler: (...args: any[]) => void): void;
  }
}

declare module 'mailparser' {
  export interface ParsedMail {
    from?: { value?: Array<{ address?: string; name?: string }> };
    to?: { value?: Array<{ address?: string; name?: string }> };
    subject?: string;
    text?: string;
    html?: string;
    messageId?: string;
    date?: Date;
  }

  export function simpleParser(source: Buffer): Promise<ParsedMail>;
}
