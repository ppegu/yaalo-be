/**
 * Logger class to log messages with different levels.
 */
class Logger {
  private name: string;

  /**
   * Creates an instance of Logger.
   * @param {string} name - The name of the logger.
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Logs a message with 'log' level.
   * @param {...any} messages - The messages to log.
   */
  log(...messages: any[]): void {
    console.log(
      `[${this.name}] LOG [${new Date().toISOString()}]:`,
      ...messages
    );
  }

  /**
   * Logs a message with 'info' level.
   * @param {...any} messages - The messages to log.
   */
  info(...messages: any[]): void {
    console.info(
      `[${this.name}] INFO [${new Date().toISOString()}]:`,
      ...messages
    );
  }

  /**
   * Logs a message with 'error' level.
   * @param {...any} messages - The messages to log.
   */
  error(...messages: any[]): void {
    console.error(
      `[${this.name}] ERROR [${new Date().toISOString()}]:`,
      ...messages
    );
  }

  /**
   * Creates a new Logger instance.
   * @param {string} name - The name of the logger.
   * @returns {Logger} - A new Logger instance.
   */
  static createLogger(name: string): Logger {
    return new Logger(name);
  }
}

export default Logger;
