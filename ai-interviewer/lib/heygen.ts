import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
  type StartAvatarRequest,
} from "@heygen/streaming-avatar";

/**
 * Thin wrapper around `@heygen/streaming-avatar`.
 *
 * Goals:
 *  - centralise default config (quality / language / idle timeout)
 *  - provide a simple `speak(text)` that uses TaskType.REPEAT only
 *  - surface barge-in via a `onUserStart` callback the UI can wire to mic VAD
 *  - guarantee `stopAvatar()` runs to avoid HeyGen credit leaks
 *
 * One instance per interview session.
 */

export interface HeyGenSessionOptions {
  token: string;
  avatarId: string;
  voiceId: string;
  videoEl: HTMLVideoElement;
  language?: string;
  quality?: AvatarQuality;
  onUserStart?: () => void;
  onUserStop?: () => void;
  onAvatarStartTalking?: () => void;
  onAvatarStopTalking?: () => void;
  onError?: (err: unknown) => void;
}

export class HeyGenSession {
  private avatar: StreamingAvatar;
  private started = false;
  private stopped = false;

  constructor(private opts: HeyGenSessionOptions) {
    this.avatar = new StreamingAvatar({ token: opts.token });
    this.bindEvents();
  }

  private bindEvents() {
    const { videoEl } = this.opts;

    this.avatar.on(StreamingEvents.STREAM_READY, (event) => {
      const stream = (event as CustomEvent<MediaStream>).detail;
      if (stream && videoEl) {
        videoEl.srcObject = stream;
        videoEl.play().catch((err) => this.opts.onError?.(err));
      }
    });
    this.avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      if (videoEl) videoEl.srcObject = null;
    });

    if (this.opts.onUserStart) {
      this.avatar.on(StreamingEvents.USER_START, this.opts.onUserStart);
    }
    if (this.opts.onUserStop) {
      this.avatar.on(StreamingEvents.USER_STOP, this.opts.onUserStop);
    }
    if (this.opts.onAvatarStartTalking) {
      this.avatar.on(
        StreamingEvents.AVATAR_START_TALKING,
        this.opts.onAvatarStartTalking,
      );
    }
    if (this.opts.onAvatarStopTalking) {
      this.avatar.on(
        StreamingEvents.AVATAR_STOP_TALKING,
        this.opts.onAvatarStopTalking,
      );
    }
  }

  async start() {
    if (this.started) return;
    this.started = true;
    const req: StartAvatarRequest = {
      quality: this.opts.quality ?? AvatarQuality.Low,
      avatarName: this.opts.avatarId,
      voice: { voiceId: this.opts.voiceId },
      language: this.opts.language ?? "ja",
      disableIdleTimeout: true,
    };
    await this.avatar.createStartAvatar(req);
  }

  /** Make the avatar utter `text` verbatim (REPEAT mode — never uses HeyGen LLM). */
  async speak(text: string) {
    if (!this.started || this.stopped) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    await this.avatar.speak({
      text: trimmed,
      taskType: TaskType.REPEAT,
    });
  }

  /** Stop avatar mid-utterance — used for barge-in. */
  async interrupt() {
    if (!this.started || this.stopped) return;
    try {
      await this.avatar.interrupt();
    } catch (err) {
      this.opts.onError?.(err);
    }
  }

  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    try {
      await this.avatar.stopAvatar();
    } catch (err) {
      this.opts.onError?.(err);
    }
  }
}

/** Fetch a fresh HeyGen session token from our own API. */
export async function fetchHeyGenToken(): Promise<string> {
  const res = await fetch("/api/heygen-token", { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to fetch HeyGen token (${res.status})`);
  }
  const data = (await res.json()) as { token: string };
  if (!data.token) throw new Error("HeyGen token missing in response");
  return data.token;
}
