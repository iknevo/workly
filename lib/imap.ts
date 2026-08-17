import {
  ImapFlow,
  type MessageAddressObject,
  type MessageEnvelopeObject,
  type SearchObject,
} from "imapflow";
import { simpleParser } from "mailparser";

export type MailProvider = "gmail" | "yahoo" | "icloud" | "imap";

export type ImapAccountConfig = {
  provider: MailProvider;
  email: string;
  appPassword: string;
  host: string;
  port: number;
  folder: string;
};

export const MAIL_PROVIDERS: Record<
  Exclude<MailProvider, "imap">,
  { host: string; port: number; folder: string }
> = {
  gmail: { host: "imap.gmail.com", port: 993, folder: "[Gmail]/All Mail" },
  yahoo: { host: "imap.mail.yahoo.com", port: 993, folder: "INBOX" },
  icloud: { host: "imap.mail.me.com", port: 993, folder: "INBOX" },
};

export function resolveImapConfig(input: {
  provider: MailProvider;
  email: string;
  appPassword: string;
  host?: string;
  port?: number;
  folder?: string;
}): ImapAccountConfig {
  const preset =
    input.provider === "imap"
      ? { host: input.host ?? "", port: input.port ?? 993, folder: input.folder ?? "INBOX" }
      : MAIL_PROVIDERS[input.provider];

  return {
    provider: input.provider,
    email: input.email.trim().toLowerCase(),
    appPassword: input.appPassword.trim().replace(/\s+/g, ""),
    host: input.host?.trim() || preset.host,
    port: input.port ?? preset.port,
    folder: preset.folder,
  };
}

function createClient(config: ImapAccountConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.email, pass: config.appPassword },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 60000,
    clientInfo: { name: "workly", version: "0.1.0" },
  });
}

export type VerifiedConnection = {
  email: string;
  folders: string[];
  allMailPath: string | null;
};

export async function verifyConnection(config: ImapAccountConfig): Promise<VerifiedConnection> {
  const client = createClient(config);
  try {
    await client.connect();
    const folders = await client.list();
    const allMailPath = folders.find((m) => m.specialUse === "\\All")?.path ?? null;
    return {
      email: config.email,
      folders: folders.map((m) => m.path),
      allMailPath,
    };
  } finally {
    client.close();
  }
}

export type ImapFetch = {
  uid: number;
  envelope: MessageEnvelopeObject;
  internalDate: Date | null;
  flags: Set<string>;
  labels: string[];
  source: Buffer;
};

export class ImapSession {
  private client: ImapFlow;
  private lock?: { release(): void };

  constructor(private config: ImapAccountConfig) {
    this.client = createClient(config);
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async close(): Promise<void> {
    try {
      this.client.close();
    } catch {
      // best-effort teardown
    }
  }

  async resolveFolder(): Promise<string> {
    const { folder } = this.config;
    if (folder !== "[Gmail]/All Mail") return folder;

    const folders = await this.client.list();
    const allMail = folders.find((m) => m.specialUse === "\\All")?.path ?? null;
    if (allMail) return allMail;
    try {
      await this.client.mailboxOpen(folder, { readOnly: true });
      return folder;
    } catch {
      return "INBOX";
    }
  }

  async open(folder: string): Promise<void> {
    this.release();
    const lock = await this.client.getMailboxLock(folder, { readOnly: true });
    this.lock = lock;
  }

  async search(query: SearchObject): Promise<number[]> {
    const result = await this.client.search(query, { uid: true });
    if (!result) return [];
    return [...new Set(result)];
  }

  async fetch(uid: number, options?: { sourceMaxLength?: number }): Promise<ImapFetch | null> {
    const message = await this.client.fetchOne(
      uid,
      {
        uid: true,
        envelope: true,
        internalDate: true,
        flags: true,
        labels: true,
        source: { maxLength: options?.sourceMaxLength ?? 20000 },
      },
      { uid: true }
    );
    if (!message || !message.envelope) return null;
    return {
      uid,
      envelope: message.envelope,
      internalDate: message.internalDate ? new Date(message.internalDate) : null,
      flags: message.flags ?? new Set<string>(),
      labels: message.labels ? [...message.labels] : [],
      source: message.source ?? Buffer.alloc(0),
    };
  }

  release(): void {
    this.lock?.release();
    this.lock = undefined;
  }
}

export function formatEnvelopeAddress(addresses: MessageAddressObject[] | undefined): string {
  if (!addresses || addresses.length === 0) return "";
  return addresses
    .map((a) => {
      const name = a.name?.trim();
      const address = a.address?.trim();
      if (name && address && name !== address) return `${name} <${address}>`;
      return address ?? name ?? "";
    })
    .filter(Boolean)
    .join(", ");
}

export async function parseBodyText(source: Buffer): Promise<string> {
  if (source.length === 0) return "";
  try {
    const parsed = await simpleParser(source);
    return (parsed.text || (parsed.textAsHtml ? stripHtml(parsed.textAsHtml) : "") || "").trim();
  } catch {
    return "";
  }
}

export async function makeSnippet(source: Buffer): Promise<string> {
  return (await parseBodyText(source)).replace(/\s+/g, " ").slice(0, 400);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}
