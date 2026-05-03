declare module "*.css";

interface Window {
  snap: {
    pay: (token: string, options: any) => void;
  };
}
