export abstract class LoggerPort {
  public abstract log(message: string): void;
  public abstract error(message: string, trace?: string): void;
  public abstract warn(message: string): void;
  public abstract debug(message: string): void;
}
