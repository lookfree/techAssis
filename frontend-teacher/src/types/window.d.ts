declare global {
  interface Window {
    _env_: {
      REACT_APP_API_URL?: string;
      REACT_APP_WS_URL?: string;
    };
  }
}

export {};