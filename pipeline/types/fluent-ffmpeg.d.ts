declare module "fluent-ffmpeg" {
  interface FfmpegCommand {
    outputOptions(options: string[]): FfmpegCommand;
    output(path: string): FfmpegCommand;
    on(event: "end", cb: () => void): FfmpegCommand;
    on(event: "error", cb: (err: Error) => void): FfmpegCommand;
    on(event: string, cb: (...args: unknown[]) => void): FfmpegCommand;
    run(): void;
  }

  function ffmpeg(input?: string): FfmpegCommand;
  namespace ffmpeg {
    function setFfmpegPath(path: string): void;
  }

  export = ffmpeg;
}

declare module "@ffmpeg-installer/ffmpeg" {
  const installer: { path: string; version: string; url: string };
  export = installer;
}
