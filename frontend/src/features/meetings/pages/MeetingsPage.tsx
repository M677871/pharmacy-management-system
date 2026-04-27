import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import {
  CameraIcon,
  MicIcon,
  ScreenShareIcon,
  VideoIcon,
} from '../../../shared/components/AppIcons';
import { formatDateTime, getErrorMessage } from '../../../shared/utils/format';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRealtime } from '../../realtime/hooks/useRealtime';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import {
  realtimeEvent,
  type CaptionSegment,
  type Meeting,
  type MeetingNote,
  type RealtimeUserSummary,
  type RecordingItem,
} from '../../realtime/types/realtime.types';
import { meetingsService } from '../services/meetings.service';

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

function toDateTimeLocal(value: Date) {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getInitialMeetingForm() {
  return {
    title: '',
    agenda: '',
    scheduledStartAt: toDateTimeLocal(new Date(Date.now() + 60 * 60_000)),
    durationMinutes: 30,
    participantIds: [] as string[],
  };
}

function splitMeetings(meetings: Meeting[]) {
  const now = Date.now();
  return {
    upcoming: meetings.filter(
      (meeting) =>
        ['scheduled', 'live'].includes(meeting.state) &&
        Date.parse(meeting.scheduledStartAt) + meeting.durationMinutes * 60_000 >= now,
    ),
    past: meetings.filter(
      (meeting) =>
        ['ended', 'cancelled'].includes(meeting.state) ||
        Date.parse(meeting.scheduledStartAt) + meeting.durationMinutes * 60_000 < now,
    ),
  };
}

export function MeetingsPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinMeeting, leaveMeeting, sendMeetingSignal } = useRealtime();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [eligibleParticipants, setEligibleParticipants] = useState<RealtimeUserSummary[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [form, setForm] = useState(getInitialMeetingForm);
  const [noteBody, setNoteBody] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [captionStatus, setCaptionStatus] = useState('');
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<Date | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const subtitlesEnabledRef = useRef(subtitlesEnabled);
  const selectedMeetingId = meetingId ?? '';
  const canHostControl =
    Boolean(selectedMeeting && user) &&
    (selectedMeeting?.hostId === user?.id || user?.role === 'admin');
  const meetingJoinable = Boolean(
    selectedMeeting &&
      ['scheduled', 'live'].includes(selectedMeeting.state),
  );

  const groupedMeetings = useMemo(() => splitMeetings(meetings), [meetings]);

  useEffect(() => {
    subtitlesEnabledRef.current = subtitlesEnabled;
  }, [subtitlesEnabled]);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [meetingItems, participants] = await Promise.all([
        meetingsService.list(),
        meetingsService.listEligibleParticipants(),
      ]);
      setMeetings(meetingItems);
      setEligibleParticipants(participants);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load meetings.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMeetingDetails(id: string) {
    setLoading(true);
    setError('');

    try {
      const [meeting, meetingNotes, meetingRecordings, meetingCaptions] =
        await Promise.all([
          meetingsService.get(id),
          meetingsService.listNotes(id),
          meetingsService.listRecordings(id),
          meetingsService.listCaptions(id),
        ]);
      setSelectedMeeting(meeting);
      setNotes(meetingNotes);
      setRecordings(meetingRecordings);
      setCaptions(meetingCaptions);
      setJoined(
        meeting.participants.some(
          (participant) =>
            participant.userId === user?.id && participant.status === 'joined',
        ),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load meeting details.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedMeetingId) {
      void loadMeetingDetails(selectedMeetingId);
      return;
    }

    void loadDashboard();
  }, [selectedMeetingId]);

  useRealtimeEvent(realtimeEvent.meetingUpdated, (meeting) => {
    setMeetings((current) =>
      current.some((item) => item.id === meeting.id)
        ? current.map((item) => (item.id === meeting.id ? meeting : item))
        : [meeting, ...current],
    );

    if (meeting.id === selectedMeetingId) {
      setSelectedMeeting(meeting);
    }
  });

  useRealtimeEvent(realtimeEvent.meetingNoteCreated, (note) => {
    if (note.meetingId === selectedMeetingId) {
      setNotes((current) =>
        current.some((item) => item.id === note.id) ? current : [...current, note],
      );
    }
  });

  useRealtimeEvent(realtimeEvent.meetingNoteUpdated, (note) => {
    if (note.meetingId === selectedMeetingId) {
      setNotes((current) =>
        current.map((item) => (item.id === note.id ? note : item)),
      );
    }
  });

  useRealtimeEvent(realtimeEvent.meetingRecordingCreated, (recordingItem) => {
    if (recordingItem.meetingId === selectedMeetingId) {
      setRecordings((current) =>
        current.some((item) => item.id === recordingItem.id)
          ? current
          : [recordingItem, ...current],
      );
    }
  });

  useRealtimeEvent(realtimeEvent.captionSegmentCreated, (caption) => {
    if (caption.sessionType === 'meeting' && caption.sessionId === selectedMeetingId) {
      setCaptions((current) =>
        current.some((item) => item.id === caption.id)
          ? current
          : [...current, caption].slice(-20),
      );
    }
  });

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function publishCaption(text: string, source: 'manual' | 'browser_speech') {
    const trimmed = text.trim();

    if (!selectedMeeting || !trimmed || !joined) {
      return;
    }

    await meetingsService.createCaption(selectedMeeting.id, {
      text: trimmed,
      sourceLanguage: 'en-US',
      targetLanguage: targetLanguage || undefined,
      source,
    });
  }

  useEffect(() => {
    if (!subtitlesEnabled || !joined || !selectedMeeting) {
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
      const text = latest?.isFinal ? latest[0].transcript.trim() : '';

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
      recognition.stop();
    };
  }, [joined, selectedMeeting, subtitlesEnabled, targetLanguage]);

  async function handleCreateMeeting(event: FormEvent) {
    event.preventDefault();
    setSavingMeeting(true);
    setError('');
    setFlash('');

    try {
      const meeting = await meetingsService.create({
        title: form.title.trim(),
        agenda: form.agenda.trim() || undefined,
        scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),
        durationMinutes: form.durationMinutes,
        participantIds: form.participantIds,
      });
      setForm(getInitialMeetingForm());
      setMeetings((current) => [meeting, ...current]);
      setFlash('Meeting scheduled and invitations sent.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to schedule the meeting.'));
    } finally {
      setSavingMeeting(false);
    }
  }

  async function handleJoin() {
    if (!selectedMeeting || !meetingJoinable) {
      return;
    }

    try {
      setError('');
      setFlash('');

      let stream: MediaStream | null = null;
      let joinNotice = '';

      if (navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          setCameraEnabled(Boolean(stream.getVideoTracks().length));
          setMuted(!stream.getAudioTracks().length);
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
            setCameraEnabled(false);
            setMuted(!stream.getAudioTracks().length);
            joinNotice = 'Camera unavailable. Joined with audio.';
          } catch {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true,
              });
              setCameraEnabled(Boolean(stream.getVideoTracks().length));
              setMuted(true);
              joinNotice = 'Microphone unavailable. Joined with video only.';
            } catch {
              setCameraEnabled(false);
              setMuted(true);
              joinNotice = 'Joined without camera or microphone.';
            }
          }
        }
      } else {
        setCameraEnabled(false);
        setMuted(true);
        joinNotice = 'Joined without camera or microphone.';
      }

      if (stream) {
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      const meeting = await joinMeeting(selectedMeeting.id).catch(() =>
        meetingsService.join(selectedMeeting.id),
      );
      setSelectedMeeting(meeting);
      setJoined(true);
      setFlash(joinNotice);
    } catch (joinError) {
      setFlash('');
      setError(
        getErrorMessage(
          joinError,
          'Unable to join. Check camera and microphone permissions.',
        ),
      );
    }
  }

  async function handleLeave() {
    if (!selectedMeeting) {
      return;
    }

    handleStopRecording();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    const meeting = await leaveMeeting(selectedMeeting.id).catch(() =>
      meetingsService.leave(selectedMeeting.id),
    );
    setSelectedMeeting(meeting);
    setJoined(false);
  }

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });
    setMuted((current) => !current);
  }

  function toggleCamera() {
    const videoTracks = localStreamRef.current?.getVideoTracks() ?? [];

    if (!videoTracks.length) {
      setFlash('Camera is unavailable for this meeting.');
      return;
    }

    videoTracks.forEach((track) => {
      track.enabled = !cameraEnabled;
    });
    setCameraEnabled((current) => !current);
  }

  async function toggleScreenShare() {
    if (!selectedMeeting) {
      return;
    }

    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      await sendMeetingSignal({
        meetingId: selectedMeeting.id,
        type: 'screen-share-stopped',
        payload: {},
      }).catch(() => {
        return;
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = stream;
      setScreenSharing(true);
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setScreenSharing(false);
      });
      await sendMeetingSignal({
        meetingId: selectedMeeting.id,
        type: 'screen-share-started',
        payload: {},
      }).catch(() => {
        return;
      });
    } catch (screenError) {
      setError(getErrorMessage(screenError, 'Unable to share your screen.'));
    }
  }

  async function handleStartRecording() {
    if (!selectedMeeting || typeof MediaRecorder === 'undefined') {
      setError('Recording is not available in this browser.');
      return;
    }

    const streams = [localStreamRef.current, screenStreamRef.current].filter(
      (stream): stream is MediaStream => Boolean(stream),
    );

    if (!streams.length) {
      setError('Join the meeting before recording.');
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

      void meetingsService
        .createRecording(selectedMeeting.id, {
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

  async function handleManualCaption(event: FormEvent) {
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

  async function handleCreateNote(event: FormEvent) {
    event.preventDefault();

    if (!selectedMeeting || !noteBody.trim()) {
      return;
    }

    try {
      const note = await meetingsService.createNote(selectedMeeting.id, noteBody.trim());
      setNotes((current) =>
        current.some((item) => item.id === note.id) ? current : [...current, note],
      );
      setNoteBody('');
    } catch (noteError) {
      setError(getErrorMessage(noteError, 'Unable to save the note.'));
    }
  }

  function toggleParticipant(userId: string) {
    setForm((current) => ({
      ...current,
      participantIds: current.participantIds.includes(userId)
        ? current.participantIds.filter((id) => id !== userId)
        : [...current.participantIds, userId],
    }));
  }

  if (selectedMeetingId) {
    return (
      <AppShell
        pageTitle="Meetings"
        pageSubtitle="Staff meeting room with protected access, media controls, notes, recordings, and captions."
        actions={
          <button
            type="button"
            className="workspace-secondary-action"
            onClick={() => navigate('/meetings')}
          >
            Dashboard
          </button>
        }
      >
        {error ? <div className="error-message">{error}</div> : null}
        {loading && !selectedMeeting ? <div className="surface-empty">Loading meeting...</div> : null}
        {selectedMeeting ? (
          <section className="meetings-detail-grid">
            <article className="surface-card meetings-room-card">
              <div className="surface-card-header compact">
                <div>
                  <span className="surface-card-eyebrow">{selectedMeeting.state}</span>
                  <h2>{selectedMeeting.title}</h2>
                  <p className="meetings-muted">
                    {formatDateTime(selectedMeeting.scheduledStartAt)} · {selectedMeeting.durationMinutes} min
                  </p>
                </div>
                <div className="meetings-actions">
                  {!joined ? (
                    <button
                      type="button"
                      className="workspace-primary-action"
                      onClick={() => void handleJoin()}
                      disabled={!meetingJoinable}
                    >
                      {meetingJoinable ? 'Join' : 'Closed'}
                    </button>
                  ) : (
                    <button type="button" className="workspace-danger-action" onClick={() => void handleLeave()}>
                      Leave
                    </button>
                  )}
                  {canHostControl && selectedMeeting.state !== 'ended' ? (
                    <button
                      type="button"
                      className="workspace-secondary-action"
                      onClick={() => {
                        void meetingsService.end(selectedMeeting.id).then(setSelectedMeeting).catch((endError) => {
                          setError(getErrorMessage(endError, 'Unable to end meeting.'));
                        });
                      }}
                    >
                      End
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="meeting-video-stage">
                <video ref={localVideoRef} autoPlay muted playsInline />
                {!joined ? <div className="meeting-stage-placeholder">Join to start audio and video.</div> : null}
              </div>

              <div className="rtc-control-grid meetings-controls">
                <button type="button" className="rtc-icon-action" onClick={toggleMute} disabled={!joined}>
                  <MicIcon className="workspace-mini-icon" />
                  <span>{muted ? 'Unmute' : 'Mute'}</span>
                </button>
                <button type="button" className="rtc-icon-action" onClick={toggleCamera} disabled={!joined}>
                  <CameraIcon className="workspace-mini-icon" />
                  <span>{cameraEnabled ? 'Camera off' : 'Camera on'}</span>
                </button>
                <button type="button" className="rtc-icon-action" onClick={() => void toggleScreenShare()} disabled={!joined}>
                  <ScreenShareIcon className="workspace-mini-icon" />
                  <span>{screenSharing ? 'Stop share' : 'Share'}</span>
                </button>
                <button
                  type="button"
                  className="rtc-icon-action"
                  disabled={!joined}
                  onClick={() => {
                    if (recording) {
                      handleStopRecording();
                    } else {
                      void handleStartRecording();
                    }
                  }}
                >
                  <VideoIcon className="workspace-mini-icon" />
                  <span>{recording ? 'Stop rec' : 'Record'}</span>
                </button>
                <button
                  type="button"
                  className="rtc-icon-action"
                  disabled={!joined}
                  onClick={() => setSubtitlesEnabled((current) => !current)}
                >
                  <span>CC</span>
                  <span>{subtitlesEnabled ? 'Captions off' : 'Captions'}</span>
                </button>
                <label className="rtc-language-field">
                  <span>Translate</span>
                  <input
                    value={targetLanguage}
                    onChange={(event) => setTargetLanguage(event.target.value)}
                    placeholder="es"
                    maxLength={8}
                  />
                  </label>
              </div>

              {subtitlesEnabled && joined ? (
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

              {subtitlesEnabled && captions.length ? (
                <div className="rtc-captions meeting-captions">
                  {captions.slice(-6).map((caption) => (
                    <p key={caption.id}>
                      <strong>{caption.author.displayName}:</strong>{' '}
                      {caption.translatedText ?? caption.text}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>

            <aside className="meetings-side-panel">
              <section className="surface-card">
                <div className="surface-card-header compact">
                  <div>
                    <span className="surface-card-eyebrow">Participants</span>
                    <h2>{selectedMeeting.participants.length}</h2>
                  </div>
                </div>
                <div className="meeting-participant-list">
                  {selectedMeeting.participants.map((participant) => (
                    <div key={participant.id} className="meeting-participant-row">
                      <div>
                        <strong>{participant.user.displayName}</strong>
                        <span>{participant.role} · {participant.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="surface-card">
                <div className="surface-card-header compact">
                  <div>
                    <span className="surface-card-eyebrow">Notes</span>
                    <h2>Meeting notes</h2>
                  </div>
                </div>
                <form className="meeting-note-form" onSubmit={handleCreateNote}>
                  <textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder="Add a note"
                    rows={3}
                  />
                  <button type="submit" className="workspace-primary-action" disabled={!noteBody.trim()}>
                    Add note
                  </button>
                </form>
                <div className="meeting-note-list">
                  {notes.map((note) => (
                    <article key={note.id} className="meeting-note-item">
                      <strong>{note.author.displayName}</strong>
                      <p>{note.content}</p>
                      <span>{formatDateTime(note.createdAt)}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface-card">
                <div className="surface-card-header compact">
                  <div>
                    <span className="surface-card-eyebrow">Recordings</span>
                    <h2>{recordings.length}</h2>
                  </div>
                </div>
                <div className="meeting-recording-list">
                  {recordings.length ? (
                    recordings.map((item) => (
                      <a key={item.id} href={item.downloadUrl ?? '#'} className="meeting-recording-link">
                        {formatDateTime(item.createdAt)} · {item.durationSeconds}s
                      </a>
                    ))
                  ) : (
                    <div className="surface-empty">No recordings yet.</div>
                  )}
                </div>
              </section>
            </aside>
          </section>
        ) : null}
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="Meetings"
      pageSubtitle="Schedule and manage staff meetings separately from customer chat."
      actions={
        <div className="messages-toolbar">
          <div className="messages-toolbar-pill">
            <span className="messages-toolbar-pill-label">Upcoming</span>
            <strong>{groupedMeetings.upcoming.length}</strong>
          </div>
          <div className="messages-toolbar-pill">
            <span className="messages-toolbar-pill-label">Past</span>
            <strong>{groupedMeetings.past.length}</strong>
          </div>
        </div>
      }
    >
      {error ? <div className="error-message">{error}</div> : null}
      {flash ? <div className="success-message">{flash}</div> : null}

      <section className="meetings-dashboard-grid">
        <article className="surface-card">
          <div className="surface-card-header compact">
            <div>
              <span className="surface-card-eyebrow">Schedule</span>
              <h2>Create meeting</h2>
            </div>
          </div>
          <form className="workspace-form-grid" onSubmit={handleCreateMeeting}>
            <label className="workspace-field">
              <span>Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                minLength={3}
                maxLength={160}
              />
            </label>
            <label className="workspace-field">
              <span>Start time</span>
              <input
                type="datetime-local"
                value={form.scheduledStartAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, scheduledStartAt: event.target.value }))
                }
                required
              />
            </label>
            <label className="workspace-field">
              <span>Duration</span>
              <input
                type="number"
                min={5}
                max={1440}
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="workspace-field workspace-field-span-two">
              <span>Agenda</span>
              <textarea
                value={form.agenda}
                onChange={(event) => setForm((current) => ({ ...current, agenda: event.target.value }))}
                rows={4}
                maxLength={4000}
              />
            </label>
            <div className="workspace-field workspace-field-span-two">
              <span>Participants</span>
              <div className="meeting-staff-picker">
                {eligibleParticipants
                  .filter((participant) => participant.id !== user?.id)
                  .map((participant) => (
                    <label key={participant.id} className="meeting-staff-option">
                      <input
                        type="checkbox"
                        checked={form.participantIds.includes(participant.id)}
                        onChange={() => toggleParticipant(participant.id)}
                      />
                      <span>{participant.displayName}</span>
                    </label>
                  ))}
              </div>
            </div>
            <button
              type="submit"
              className="workspace-primary-action workspace-field-span-two"
              disabled={savingMeeting || !form.title.trim()}
            >
              {savingMeeting ? 'Scheduling...' : 'Schedule meeting'}
            </button>
          </form>
        </article>

        <section className="meetings-list-column">
          <article className="surface-card">
            <div className="surface-card-header compact">
              <div>
                <span className="surface-card-eyebrow">Upcoming</span>
                <h2>Meeting dashboard</h2>
              </div>
            </div>
            {loading ? <div className="surface-empty">Loading meetings...</div> : null}
            <div className="meeting-card-list">
              {groupedMeetings.upcoming.map((meeting) => (
                <button
                  key={meeting.id}
                  type="button"
                  className="meeting-list-card"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  <strong>{meeting.title}</strong>
                  <span>{formatDateTime(meeting.scheduledStartAt)} · {meeting.state}</span>
                  <p>{meeting.participants.length} participants</p>
                </button>
              ))}
              {!loading && !groupedMeetings.upcoming.length ? (
                <div className="surface-empty">No upcoming meetings.</div>
              ) : null}
            </div>
          </article>

          <article className="surface-card">
            <div className="surface-card-header compact">
              <div>
                <span className="surface-card-eyebrow">Past</span>
                <h2>History</h2>
              </div>
            </div>
            <div className="meeting-card-list">
              {groupedMeetings.past.slice(0, 10).map((meeting) => (
                <button
                  key={meeting.id}
                  type="button"
                  className="meeting-list-card compact"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  <strong>{meeting.title}</strong>
                  <span>{formatDateTime(meeting.scheduledStartAt)} · {meeting.state}</span>
                </button>
              ))}
              {!groupedMeetings.past.length ? (
                <div className="surface-empty">No past meetings.</div>
              ) : null}
            </div>
          </article>
        </section>
      </section>
    </AppShell>
  );
}
