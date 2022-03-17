enum TokenType {
  Text,
  Name,
}

enum State {
  Text,
  LeftBrace,
  Name,
  RightBrace,
}

interface Token {
  type: TokenType;
  content: string;
}

export class Template {
  private tokens: Token[];

  readonly names: string[];

  constructor(readonly template: string) {
    this.tokens = Template.parse(template);
    this.names = this.tokens
      .filter((token) => token.type === TokenType.Name)
      .map((token) => token.content);
  }

  render(names: Record<string, string>) {
    if (this.names.length === 0) {
      return this.template;
    }
    return this.tokens
      .map(({ type, content }) => {
        if (type === TokenType.Text) {
          return content;
        }
        const name = names[content];
        return name ?? '';
      })
      .join('');
  }

  static parse(template: string): Token[] {
    const tokens: Token[] = [];

    let state = State.Text;
    let content = '';

    for (let i = 0; i < template.length; ++i) {
      const ch = template[i];
      content += ch;

      if (state === State.Text) {
        if (ch === '{') {
          state = State.LeftBrace;
        }
      } else if (state === State.LeftBrace) {
        if (ch === '{') {
          state = State.Name;
          if (content.length > 2) {
            tokens.push({
              type: TokenType.Text,
              content: content.slice(0, -2),
            });
          }
          content = '';
        } else {
          state = State.Text;
        }
      } else if (state === State.Name) {
        if (ch === '}') {
          state = State.RightBrace;
        }
      } else if (state === State.RightBrace) {
        if (ch === '}') {
          state = State.Text;
          tokens.push({
            type: TokenType.Name,
            content: content.slice(0, -2).trim(),
          });
          content = '';
        } else {
          state = State.Name;
        }
      }
    }

    if (content) {
      tokens.push({
        type: TokenType.Text,
        content: content,
      });
    }

    return tokens;
  }
}
