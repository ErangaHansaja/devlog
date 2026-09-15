declare module 'expo-navigation-bar' {
  export function setBackgroundColorAsync(color: string): Promise<void>;
  export function setButtonStyleAsync(style: 'light' | 'dark'): Promise<void>;
  export function setStyle(style: 'light' | 'dark'): void;
  export function setHidden(hidden: boolean): void;
  export function NavigationBar(props: any): null;
}
