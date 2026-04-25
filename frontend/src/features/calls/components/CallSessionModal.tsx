import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  onerror: null | (() => void);
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
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(call.type === 'video');
  const [recording, setRecording] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const madeOfferRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<Date | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const iceServers = useMemo(parseIceServers, []);
  const isCaller = user?.id === session.callerId;
  const otherParticipant = user?.id === session.callerId ? session.receiver : session.caller;

  useEffect(() => {
    setSession(call);
  }, [call]);

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
      if (event.candidate) {
        void sendCallSignal({
          callId: call.id,
          type: 'ice-candidate',
          payload: event.candidate.toJSON() as unknown as Record<string, unknown>,
        }).catch(() => {
          setError('Unable to send call network data.');
        });
      }
    };
    peer.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };
    peer.onconnectionstatechange = () => {
      if (['failed', 'disconnected'].includes(peer.connectionState)) {
        setError('The media connection was interrupted.');
      }
    };
    peerRef.current = peer;
    return peer;
  }, [call.id, iceServers, sendCallSignal]);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: session.type === 'video',
    });
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
        if (disposed || !isCaller || madeOfferRef.current) {
          return;
        }

        const peer = ensurePeer();
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        madeOfferRef.current = true;
        await sendCallSignal({
          callId: session.id,
          type: 'offer',
          payload: { type: offer.type, sdp: offer.sdp },
        });
      })
      .catch((mediaError) => {
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

    void (async () => {
      const peer = ensurePeer();
      await ensureLocalMedia();

      if (signal.type === 'offer') {
        await peer.setRemoteDescription(
          signal.payload as unknown as RTCSessionDescriptionInit,
        );
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendCallSignal({
          callId: call.id,
          type: 'answer',
          payload: { type: answer.type, sdp: answer.sdp },
        });
        return;
      }

      if (signal.type === 'answer') {
        await peer.setRemoteDescription(
          signal.payload as unknown as RTCSessionDescriptionInit,
        );
        return;
      }

      if (signal.type === 'ice-candidate') {
        await peer.addIceCandidate(signal.payload as RTCIceCandidateInit);
      }
    })().catch((signalError) => {
      setError(getErrorMessage(signalError, 'Unable to connect the call.'));
    });
  });

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerRef.current?.close();
    },
    [],
  );

  useEffect(() => {
    if (!subtitlesEnabled || session.status !== 'active') {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      return;
    }

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setError('Live subtitles are not supported in this browser.');
      setSubtitlesEnabled(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];

      if (!latest?.isFinal) {
        return;
      }

      const text = latest[0].transcript.trim();

      if (!text) {
        return;
      }

      void callsService
        .createCaption(session.id, {
          text,
          sourceLanguage: 'en-US',
          targetLanguage: targetLanguage || undefined,
        })
        .catch(() => {
          setError('Unable to publish the subtitle segment.');
        });
    };
    recognition.onerror = () => {
      setError('Live subtitle capture failed.');
    };
    recognition.onend = () => {
      if (subtitlesEnabled) {
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
      setError('Unable to start live subtitles.');
    }

    return () => {
      recognition.stop();
    };
  }, [session.id, session.status, subtitlesEnabled, targetLanguage]);

  function toggleMute() {
    const stream = localStreamRef.current;
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });
    setMuted((current) => !current);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    stream?.getVideoTracks().forEach((track) => {
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
    const recorder = new MediaRecorder(combined, {
      mimeType: MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : undefined,
    });
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
        .catch(() => {
          setError('Recording upload failed.');
        });
    };
    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setRecording(true);
  }

  function handleStopRecording() {
    mediaRecorderRef.current?.stop();
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
            <p>{session.status}</p>
          </div>
          {isFinished(session.status) ? (
            <button type="button" className="workspace-secondary-action" onClick={onClose}>
              Close
            </button>
          ) : null}
        </header>

        {error ? <div className="error-message">{error}</div> : null}

        <div className={`rtc-stage${session.type === 'voice' ? ' voice' : ''}`}>
          {session.type === 'video' ? (
            <>
              <video ref={remoteVideoRef} className="rtc-remote-video" autoPlay playsInline />
              <video
                ref={localVideoRef}
                className="rtc-local-video"
                autoPlay
                muted
                playsInline
              />
            </>
          ) : (
            <div className="rtc-voice-avatar">
              <PhoneIcon className="rtc-voice-icon" />
              <strong>{otherParticipant.displayName}</strong>
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

        {session.status === 'ringing' && !isCaller ? (
          <div className="rtc-control-row">
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
          </div>
        ) : (
          <div className="rtc-control-grid">
            <button type="button" className="rtc-icon-action" onClick={toggleMute} title="Mute microphone">
              <MicIcon className="workspace-mini-icon" />
              <span>{muted ? 'Unmute' : 'Mute'}</span>
            </button>
            {session.type === 'video' ? (
              <button type="button" className="rtc-icon-action" onClick={toggleCamera} title="Toggle camera">
                <CameraIcon className="workspace-mini-icon" />
                <span>{cameraEnabled ? 'Camera off' : 'Camera on'}</span>
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
              disabled={session.status !== 'active'}
            >
              <VideoIcon className="workspace-mini-icon" />
              <span>{recording ? 'Stop rec' : 'Record'}</span>
            </button>
            <button
              type="button"
              className="rtc-icon-action"
              onClick={() => setSubtitlesEnabled((current) => !current)}
              title="Toggle subtitles"
              disabled={session.status !== 'active'}
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
