export class Formatter {
  static newLine = "\r\n";
  static tab = "\t";
  static green = "\u001b[32m";
  static red = "\u001b[31m";
  static bold = "\u001b[1m";
  static resetFormat = "\u001b[0m";

  getNewLine(): string {
    return Formatter.newLine;
  }

  getTab(): string {
    return Formatter.tab;
  }

  formatInBold(text: string): string {
    return this.format(Formatter.bold + text);
  }

  formatInRed(text: string): string {
    return this.format(Formatter.red + text);
  }

  formatInGreen(text: string): string {
    return this.format(Formatter.green + text);
  }

  formatWithTab(text: string): string {
    return this.format(Formatter.tab + text);
  }

  protected format(text: string): string {
    return text + Formatter.resetFormat + Formatter.newLine;
  }
}
