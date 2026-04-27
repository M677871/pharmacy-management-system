import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRealtime } from '../../realtime/hooks/useRealtime';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import {
  realtimeEvent,
  type CallSession,
  type CaptionSegment,
  type RtcSignalEvent,
} from '../../realtime/types/realtime.types';
import { CameraIcon, MicIcon, PhoneIcon, VideoIcon } from '../../../shared/components/AppIcons';
import { getErrorMessage } from '../../../shared/utils/format';
import { callsService } from '../services/calls.service';

interface CallSessionModalProps {
  call: CallSession;
  onClose: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | null
    | ((event: {
        results: ArrayLike<{
          isFinal: boolean;
          0: { transcript: string };
        }>;
      }) => void);
  onerror: null | ((event: { error?: string }) => void);
  onend: null | (() => void);
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function parseIceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_RTC_ICE_SERVERS;

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isFinished(status: CallSession['status']) {
  return ['ended', 'missed', 'rejected', 'failed'].includes(status);
}

function getCallStatusLabel(call: CallSession) {
  if (call.status === 'missed' && !call.startedAt) {
    return 'Unavailable or missed';
  }

  return call.status;
}

export function CallSessionModal({ call, onClose }: CallSessionModalProps) {
  const { user } = useAuth();
  const {
    acceptCall,
    endCall,
    failCall,
    rejectCall,
    sendCallSignal,
  } = useRealtime();
  const [session, setSession] = useState(call);
  const [error, setError] = useState('');
  const [mediaNotice, setMediaNotice] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(call.type === 'video');
  const [localVideoAvailable, setLocalVideoAvailable] = useState(
    call.type === 'video',
  );
  const [recording, setRecording] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [captionStatus, setCaptionStatus] = useState('');
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const madeOfferRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<Date | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const subtitlesEnabledRef = useRef(subtitlesEnabled);
  const callStatusRef = useRef(call.status);
  const iceServers = useMemo(parseIceServers, []);
  const isCaller = user?.id === session.callerId;
  const otherParticipant = user?.id === session.callerId ? session.receiver : session.caller;
  const finished = isFinished(session.status);
  const canUseMediaControls = session.status === 'active';
  const WaitingIcon = session.type === 'video' ? VideoIcon : PhoneIcon;

  useEffect(() => {
    setSession(call);
  }, [call]);

  useEffect(() => {
    subtitlesEnabledRef.current = subtitlesEnabled;
  }, [subtitlesEnabled]);

  useEffect(() => {
    callStatusRef.current = session.status;
  }, [session.status]);

  const cleanupMediaSession = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Browser speech APIs can throw if stop is called after an implicit end.
    }
    recognitionRef.current = null;

    try {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // MediaRecorder state can change between the check and stop call.
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    peerRef.current = null;
    pendingIceCandidatesRef.current = [];
    madeOfferRef.current = false;
  }, []);

  useEffect(() => {
    if (!finished) {
      return;
    }

    cleanupMediaSession();
    setMediaNotice('');

    if (session.status !== 'failed') {
      setError('');
    }
  }, [cleanupMediaSession, finished, session.status]);

  useEffect(() => {
    void callsService
      .listCaptions(call.id)
      .then(setCaptions)
      .catch(() => {
        return;
      });
  }, [call.id]);

  useRealtimeEvent(realtimeEvent.callUpdated, (updatedCall) => {
    if (updatedCall.id === call.id) {
      setSession(updatedCall);
    }
  });

  useRealtimeEvent(realtimeEvent.captionSegmentCreated, (segment) => {
    if (segment.sessionType === 'call' && segment.sessionId === call.id) {
      setCaptions((current) =>
        current.some((item) => item.id === segment.id)
          ? current
          : [...current, segment].slice(-12),
      );
    }
  });

  const ensurePeer = useCallback(() => {
    if (peerRef.current) {
      return peerRef.current;
    }

    const peer = new RTCPeerConnection({ iceServers });
    peer.onicecandidate = (event) => {
      if (callStatusRef.current !== 'active') {
        return;
      }

      if (event.candidate) {
        void sendCallSignal({
          callId: call.id,
          type: 'ice-candidate',
          payload: event.candidate.toJSON() as unknown as Record<string, unknown>,
        }).catch(() => {
          if (callStatusRef.current !== 'active') {
            return;
          }

          setError('Unable to send call network data.');
        });
      }
    };
    peer.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    };
    peer.onconnectionstatechange = () => {
      if (callStatusRef.current !== 'active') {
        return;
      }

      if (peer.connectionState === 'failed') {
        setError('The media connection was interrupted.');
        void failCall(call.id).catch(() => {
          return;
        });
        return;
      }

      if (peer.connectionState === 'disconnected') {
        setError('The media connection is trying to reconnect.');
      }
    };
    peerRef.current = peer;
    return peer;
  }, [call.id, failCall, iceServers, sendCallSignal]);

  const flushPendingIceCandidates = useCallback(async (peer: RTCPeerConnection) => {
    if (!peer.remoteDescription || !pendingIceCandidatesRef.current.length) {
      return;
    }

    const candidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];

    for (const candidate of candidates) {
      if (peer.signalingState === 'closed' || callStatusRef.current !== 'active') {
        return;
      }

      await peer.addIceCandidate(candidate);
    }
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Media devices are not available in this browser.');
    }

    let stream: MediaStream | null = null;

    if (session.type === 'video') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setLocalVideoAvailable(Boolean(stream.getVideoTracks().length));
        setCameraEnabled(Boolean(stream.getVideoTracks().length));
        setMediaNotice('');
      } catch (videoError) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          setLocalVideoAvailable(false);
          setCameraEnabled(false);
          setMediaNotice('Camera unavailable. Continuing with audio.');
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
            setLocalVideoAvailable(Boolean(stream.getVideoTracks().length));
            setCameraEnabled(Boolean(stream.getVideoTracks().length));
            setMuted(true);
            setMediaNotice('Microphone unavailable. Continuing with video only.');
          } catch {
            throw videoError;
          }
        }
      }
    } else {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setLocalVideoAvailable(false);
      setCameraEnabled(false);
      setMediaNotice('');
    }

    if (!stream) {
      throw new Error('Unable to start microphone or camera.');
    }

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const peer = ensurePeer();
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    return stream;
  }, [ensurePeer, session.type]);

  useEffect(() => {
    if (session.status !== 'active') {
      return;
    }

    let disposed = false;
    void ensureLocalMedia()
      .then(async () => {
        if (
          disposed ||
          !isCaller ||
          madeOfferRef.current ||
          callStatusRef.current !== 'active'
        ) {
          return;
        }

        const peer = ensurePeer();
        if (peer.signalingState !== 'stable') {
          return;
        }

        const offer = await peer.createOffer();
        if (callStatusRef.current !== 'active') {
          return;
        }

        await peer.setLocalDescription(offer);
        madeOfferRef.current = true;

        if (callStatusRef.current !== 'active') {
          return;
        }

        await sendCallSignal({
          callId: session.id,
          type: 'offer',
          payload: { type: offer.type, sdp: offer.sdp },
        });
      })
      .catch((mediaError) => {
        if (disposed || callStatusRef.current !== 'active') {
          return;
        }

        setError(
          getErrorMessage(
            mediaError,
            'Microphone or camera permission was denied.',
          ),
        );
        void failCall(session.id).catch(() => {
          return;
        });
      });

    return () => {
      disposed = true;
    };
  }, [ensureLocalMedia, ensurePeer, failCall, isCaller, sendCallSignal, session.id, session.status]);

  useRealtimeEvent(realtimeEvent.callSignal, (signal: RtcSignalEvent) => {
    if (signal.callId !== call.id || signal.fromUserId === user?.id) {
      return;
    }

    if (callStatusRef.current !== 'active') {
      return;
    }

    void (async () => {
      const peer = ensurePeer();
      await ensureLocalMedia();

      if (callStatusRef.current !== 'active' || peer.signalingState === 'closed') {
        return;
      }

      if (signal.type === 'offer') {
        if (peer.signalingState !== 'stable') {
          return;
        }

        const description = signal.payload as unknown as RTCSessionDescriptionInit;
        await peer.setRemoteDescription(description);
        await flushPendingIceCandidates(peer);

        if (callStatusRef.current !== 'active') {
          return;
        }

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        if (callStatusRef.current !== 'active') {
          return;
        }

        await sendCallSignal({
          callId: call.id,
          type: 'answer',
          payload: { type: answer.type, sdp: answer.sdp },
        });
        return;
      }

      if (signal.type === 'answer') {
        if (peer.signalingState !== 'have-local-offer') {
          return;
        }

        const description = signal.payload as unknown as RTCSessionDescriptionInit;
        await peer.setRemoteDescription(description);
        await flushPendingIceCandidates(peer);
        return;
      }

      if (signal.type === 'ice-candidate') {
        const candidate = signal.payload as RTCIceCandidateInit;

        if (!peer.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
          return;
        }

        await peer.addIceCandidate(candidate);
      }
    })().catch((signalError) => {
      if (callStatusRef.current !== 'active') {
        return;
      }

      setError(getErrorMessage(signalError, 'Unable to connect the call.'));
    });
  });

  useEffect(
    () => () => {
      cleanupMediaSession();
    },
    [cleanupMediaSession],
  );

  const publishCaption = useCallback(
    async (text: string, source: 'manual' | 'browser_speech') => {
      const trimmed = text.trim();

      if (!trimmed || session.status !== 'active') {
        return;
      }

      await callsService.createCaption(session.id, {
        text: trimmed,
        sourceLanguage: 'en-US',
        targetLanguage: targetLanguage || undefined,
        source,
      });
    },
    [session.id, session.status, targetLanguage],
  );

  useEffect(() => {
    if (!subtitlesEnabled || session.status !== 'active') {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setCaptionStatus('');
      return;
    }

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setCaptionStatus(
        'Speech captions are unavailable here. Manual captions still work.',
      );
      return;
    }

    let active = true;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    setCaptionStatus('Listening for captions.');
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];

      if (!latest?.isFinal) {
        return;
      }

      const text = latest[0].transcript.trim();

      if (!text) {
        return;
      }

      void publishCaption(text, 'browser_speech')
        .catch(() => {
          setError('Unable to publish the subtitle segment.');
        });
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        return;
      }

      if (['not-allowed', 'service-not-allowed'].includes(event.error ?? '')) {
        setCaptionStatus(
          'Microphone permission blocked speech captions. Manual captions still work.',
        );
        return;
      }

      setCaptionStatus('Speech caption capture paused. Manual captions still work.');
    };
    recognition.onend = () => {
      if (active && subtitlesEnabledRef.current) {
        try {
          recognition.start();
        } catch {
          return;
        }
      }
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setCaptionStatus(
        'Speech captions could not start. Manual captions still work.',
      );
    }

    return () => {
      active = false;
      try {
        recognition.stop();
      } catch {
        // Browser speech APIs can throw if recognition has already stopped.
      }
    };
  }, [publishCaption, session.status, subtitlesEnabled]);

  function toggleMute() {
    const stream = localStreamRef.current;
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });
    setMuted((current) => !current);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    const videoTracks = stream?.getVideoTracks() ?? [];

    if (!videoTracks.length) {
      setMediaNotice('Camera is unavailable for this call.');
      return;
    }

    videoTracks.forEach((track) => {
      track.enabled = !cameraEnabled;
    });
    setCameraEnabled((current) => !current);
  }

  async function handleStartRecording() {
    const streams = [localStreamRef.current, remoteStreamRef.current].filter(
      (stream): stream is MediaStream => Boolean(stream),
    );

    if (!streams.length || typeof MediaRecorder === 'undefined') {
      setError('Recording is not available for this call yet.');
      return;
    }

    const combined = new MediaStream(
      streams.flatMap((stream) => stream.getTracks()),
    );
    let recorder: MediaRecorder;

    try {
      recorder = new MediaRecorder(combined, {
        mimeType: MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : undefined,
      });
    } catch (recordingError) {
      setError(getErrorMessage(recordingError, 'Recording could not start.'));
      return;
    }

    recordingChunksRef.current = [];
    recordingStartedAtRef.current = new Date();
    recorder.ondataavailable = (event) => {
      if (event.data.size) {
        recordingChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const startedAt = recordingStartedAtRef.current ?? new Date();
      const endedAt = new Date();
      const blob = new Blob(recordingChunksRef.current, {
        type: recorder.mimeType || 'video/webm',
      });
      setRecording(false);

      if (!blob.size) {
        setError('Recording did not capture audio or video.');
        return;
      }

      void callsService
        .createRecording(session.id, {
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationSeconds: Math.max(
            0,
            Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
          ),
          mimeType: blob.type,
          blob,
        })
        .catch((uploadError) => {
          setError(getErrorMessage(uploadError, 'Recording upload failed.'));
        });
    };
    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setRecording(true);
  }

  function handleStopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  async function handleManualCaption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!captionDraft.trim()) {
      return;
    }

    try {
      await publishCaption(captionDraft, 'manual');
      setCaptionDraft('');
      setCaptionStatus('Caption sent.');
    } catch (captionError) {
      setError(getErrorMessage(captionError, 'Unable to publish the subtitle segment.'));
    }
  }

  async function handleEnd() {
    await endCall(session.id).catch((endError) => {
      setError(getErrorMessage(endError, 'Unable to end the call.'));
    });
    onClose();
  }

  const subtitleItems = subtitlesEnabled ? captions.slice(-5) : [];

  return (
    <div className="rtc-modal-backdrop" role="dialog" aria-modal="true">
      <section className="rtc-modal">
        <header className="rtc-modal-header">
          <div>
            <span className="surface-card-eyebrow">{session.type} call</span>
            <h2>{otherParticipant.displayName}</h2>
            <p>{getCallStatusLabel(session)}</p>
          </div>
        </header>

        {error ? <div className="error-message">{error}</div> : null}
        {mediaNotice ? <div className="rtc-media-notice">{mediaNotice}</div> : null}

        <div
          className={`rtc-stage${
            session.type === 'voice' || !canUseMediaControls ? ' voice' : ''
          }`}
        >
          {canUseMediaControls && session.type === 'video' ? (
            <>
              <video ref={remoteVideoRef} className="rtc-remote-video" autoPlay playsInline />
              <video
                ref={localVideoRef}
                className={`rtc-local-video${localVideoAvailable ? '' : ' hidden'}`}
                autoPlay
                muted
                playsInline
              />
            </>
          ) : (
            <div className="rtc-voice-avatar rtc-waiting-avatar">
              <audio ref={remoteAudioRef} autoPlay />
              <WaitingIcon className="rtc-voice-icon" />
              <strong>{otherParticipant.displayName}</strong>
              {session.status === 'ringing' ? (
                <span>
                  {isCaller
                    ? 'Waiting for answer'
                    : `${session.caller.displayName} is calling`}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {subtitleItems.length ? (
          <div className="rtc-captions">
            {subtitleItems.map((caption) => (
              <p key={caption.id}>
                <strong>{caption.author.displayName}:</strong>{' '}
                {caption.translatedText ?? caption.text}
              </p>
            ))}
          </div>
        ) : null}

        {subtitlesEnabled && canUseMediaControls ? (
          <form className="rtc-caption-composer" onSubmit={handleManualCaption}>
            {captionStatus ? <span>{captionStatus}</span> : null}
            <div>
              <input
                value={captionDraft}
                onChange={(event) => setCaptionDraft(event.target.value)}
                placeholder="Type a caption"
                maxLength={400}
              />
              <button
                type="submit"
                className="workspace-secondary-action"
                disabled={!captionDraft.trim()}
              >
                Send
              </button>
            </div>
          </form>
        ) : null}

        {finished ? (
          <div className="rtc-control-row">
            <button type="button" className="workspace-secondary-action" onClick={onClose}>
              Close
            </button>
          </div>
        ) : session.status === 'ringing' ? (
          <div className="rtc-control-row">
            {isCaller ? (
              <button type="button" className="workspace-danger-action" onClick={() => void handleEnd()}>
                Cancel call
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="workspace-primary-action"
                  onClick={() => {
                    void acceptCall(session.id).catch((acceptError) => {
                      setError(getErrorMessage(acceptError, 'Unable to accept the call.'));
                    });
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="workspace-danger-action"
                  onClick={() => {
                    void rejectCall(session.id)
                      .catch((rejectError) => {
                        setError(getErrorMessage(rejectError, 'Unable to reject the call.'));
                      })
                      .finally(onClose);
                  }}
                >
                  Reject
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="rtc-control-grid">
            <button
              type="button"
              className="rtc-icon-action"
              onClick={toggleMute}
              title="Mute microphone"
              disabled={!canUseMediaControls}
            >
              <MicIcon className="workspace-mini-icon" />
              <span>{muted ? 'Unmute' : 'Mute'}</span>
            </button>
            {session.type === 'video' ? (
              <button
                type="button"
                className="rtc-icon-action"
                onClick={toggleCamera}
                title="Toggle camera"
                disabled={!canUseMediaControls}
              >
                <CameraIcon className="workspace-mini-icon" />
                <span>
                  {!localVideoAvailable
                    ? 'No camera'
                    : cameraEnabled
                      ? 'Camera off'
                      : 'Camera on'}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="rtc-icon-action"
              onClick={() => {
                if (recording) {
                  handleStopRecording();
                } else {
                  void handleStartRecording();
                }
              }}
              title="Record call"
              disabled={!canUseMediaControls}
            >
              <VideoIcon className="workspace-mini-icon" />
              <span>{recording ? 'Stop rec' : 'Record'}</span>
            </button>
            <button
              type="button"
              className="rtc-icon-action"
              onClick={() => setSubtitlesEnabled((current) => !current)}
              title="Toggle subtitles"
              disabled={!canUseMediaControls}
            >
              <span>CC</span>
              <span>{subtitlesEnabled ? 'Captions off' : 'Captions'}</span>
            </button>
            <label className="rtc-language-field">
              <span>Translate</span>
              <input
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
                placeholder="fr"
                maxLength={8}
              />
            </label>
            <button type="button" className="workspace-danger-action" onClick={() => void handleEnd()}>
              End
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
