export interface MailMessage {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
