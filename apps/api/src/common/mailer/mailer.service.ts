export abstract class MailerService {
  abstract sendPasswordResetCode(email: string, code: string): Promise<void>;
}
