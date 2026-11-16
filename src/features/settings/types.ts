/** SMTP status shown in Settings (never includes the password). */
export type SmtpStatus = {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromEmail: string;
};
