import type { HamibotEnv } from 'hamibot';

declare global {
  /**define script config @see https://docs.hamibot.com/guide/tutorial-config */
  const defineConfig: <
    const T extends {
      label: string;
      name: string;
      placeholder?: string;
      help?: string;
      type: 'text' | 'textarea' | 'range' | 'radio' | 'checkbox' | 'select';
      validation?: 'required';
      'validation-name'?: string;
      options?: Record<string, string>;
      'show-value'?: true;
      max?: number;
      min?: number;
      step?: number;
    },
  >(
    config: T[],
  ) => HamibotEnv & {
    readonly [K in T['name']]: Extract<T, { name: K }> extends infer V extends T
      ? //@ts-ignore
        {
          text: string;
          textarea: string;
          range: `${number}`;
          radio: keyof V['options'];
          checkbox: V['options'] extends {} ? (keyof V['options'])[] : boolean;
          select: keyof V['options'];
        }[V['type']]
      : never;
  };
  type Primative = string | number | boolean | null | undefined;
  namespace NodeJS {
    interface ProcessEnv {
      browser: string;
      token: string;
      script_id: string;
    }
  }
}
