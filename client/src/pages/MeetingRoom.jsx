import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  ArrowLeft,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  Send,
  X,
  Users,
  MonitorUp,
  Sparkles,
  ListChecks,
  AudioLines,
} from "lucide-react";

import axios from "axios";

import "./MeetingRoom.css";


const API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

function MeetingRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // REFS
  // ==========================================

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const socketRef = useRef(null);

  const peerConnectionRef = useRef(null);
  const peerTargetRef = useRef(null);

  const messagesEndRef = useRef(null);

  // TRANSCRIPTION
  const recognitionRef = useRef(null);
  const transcriptionPanelRef = useRef(null);
  const aiInsightsPanelRef = useRef(null);

  // ==========================================
  // STATE
  // ==========================================

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  const [connected, setConnected] = useState(false);
  const [remoteConnected, setRemoteConnected] =
    useState(false);

  const [remoteUser, setRemoteUser] = useState(null);
  const [remoteOnline, setRemoteOnline] =
    useState(false);

  const [error, setError] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] =
    useState(false);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // ==========================================
  // TRANSCRIPTION STATE
  // ==========================================

  const [transcribing, setTranscribing] =
    useState(false);

  const [transcript, setTranscript] =
    useState("");

  // SAVED TRANSCRIPTS FROM MONGODB
  const [transcripts, setTranscripts] =
    useState([]);

  const [showTranscriptionPanel, setShowTranscriptionPanel] =
    useState(false);
const [currentTime, setCurrentTime] = useState(new Date());

useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);
  // ==========================================
  // AI MEETING INSIGHTS
  // ==========================================
const [aiInsights, setAiInsights] =
  useState(null);

const [generatingInsights, setGeneratingInsights] =
  useState(false);

const [aiError, setAiError] =
  useState("");

const [loadingSavedInsights, setLoadingSavedInsights] =
  useState(false);

const [savedAIInsights, setSavedAIInsights] =
  useState(null);

  // MEETING DETAILS / HOST
const [meetingDetails, setMeetingDetails] =
  useState(null);

const [meetingLoading, setMeetingLoading] =
  useState(true);

const [meetingExpired, setMeetingExpired] =
  useState(false);

const [meetingAccessError, setMeetingAccessError] =
  useState("");
// ACTION ITEMS
const [actionItems, setActionItems] =
  useState([]);

const [loadingActionItems, setLoadingActionItems] =
  useState(false);

const [actionItemError, setActionItemError] =
  useState("");
const [showActionItems, setShowActionItems] =
  useState(false);

  // ==========================================
  // USER
  // ==========================================

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const senderName = user.name || "You";

  const hostId =
  meetingDetails?.host?._id ||
  meetingDetails?.host ||
  null;

const currentUserId = user?.id || user?._id;

const isMeetingHost =
  !!currentUserId &&
  !!hostId &&
  hostId.toString() === currentUserId.toString();

const hostName =
  meetingDetails?.host?.name ||
  "Host";

  // ==========================================
  // START MEDIA
  // ==========================================

  const startMedia = async () => {
    try {
      setError("");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCameraOn(true);
      setMicOn(true);

      return stream;
    } catch (error) {
      console.error(
        "Media access error:",
        error
      );

      setError(
        "Camera or microphone access was denied. Please allow permissions."
      );

      return null;
    }
  };

  // ==========================================
  // WEBRTC
  // ==========================================

  const createPeerConnection = (targetUserId) => {
    peerTargetRef.current = targetUserId;

    const peerConnection =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302",
          },
        ],
      });

    peerConnectionRef.current =
      peerConnection;

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          peerConnection.addTrack(
            track,
            streamRef.current
          );
        });
    }

    peerConnection.ontrack = (event) => {
      console.log(
        "Remote stream received"
      );

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject =
          event.streams[0];

        setRemoteConnected(true);
      }
    };

    peerConnection.onicecandidate = (
      event
    ) => {
      if (
        event.candidate &&
        socketRef.current
      ) {
        socketRef.current.emit(
          "ice-candidate",
          {
            target: targetUserId,
            candidate: event.candidate,
          }
        );
      }
    };

    return peerConnection;
  };

  // ==========================================
  // WEBRTC RENEGOTIATION
  // ==========================================

  const renegotiatePeerConnection =
    async () => {
      const peerConnection =
        peerConnectionRef.current;

      const targetUserId =
        peerTargetRef.current;

      if (
        !peerConnection ||
        !targetUserId ||
        !socketRef.current
      ) {
        return;
      }

      try {
        const offer =
          await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
          offer
        );

        socketRef.current.emit("offer", {
          target: targetUserId,
          offer,
        });
      } catch (error) {
        console.error(
          "WebRTC renegotiation error:",
          error
        );
      }
    };

  // ==========================================
  // SOCKET.IO
  // ==========================================

  const connectSocket = () => {
    const socket = io(SOCKET_URL);

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "Socket connected:",
        socket.id
      );

      setConnected(true);

      socket.emit("join-room", {
        roomId,
        userName: senderName,
      });

      socket.emit(
        "get-messages",
        roomId
      );
    });

    // ========================================
    // EXISTING USERS
    // ========================================

    socket.on(
      "room-users",
      async (users) => {
        console.log(
          "Existing users:",
          users
        );

        if (users.length === 0) {
          return;
        }

        const participant =
          users[0];

        setRemoteUser(participant);
        setRemoteConnected(true);
        setRemoteOnline(true);

        const targetUserId =
          participant.socketId;

        const peerConnection =
          createPeerConnection(
            targetUserId
          );

        const offer =
          await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
          offer
        );

        socket.emit("offer", {
          target: targetUserId,
          offer,
        });
      }
    );

    // ========================================
    // NEW USER
    // ========================================

    socket.on(
      "user-joined",
      (user) => {
        console.log(
          `${user.userName} joined`
        );

        setRemoteUser(user);
        setRemoteOnline(true);
      }
    );

    // ========================================
    // PARTICIPANT STATUS
    // ========================================

    socket.on(
      "participant-status",
      (participant) => {
        if (
          participant.socketId ===
          socket.id
        ) {
          return;
        }

        setRemoteUser(
          (previousUser) => {
            if (
              previousUser &&
              previousUser.socketId ===
                participant.socketId
            ) {
              return {
                ...previousUser,
                online:
                  participant.status ===
                  "online",
              };
            }

            return {
              socketId:
                participant.socketId,
              userName:
                participant.userName,
              online:
                participant.status ===
                "online",
            };
          }
        );

        setRemoteOnline(
          participant.status ===
            "online"
        );
      }
    );

    // ========================================
    // OFFER
    // ========================================

    socket.on(
      "offer",
      async ({
        sender,
        offer,
      }) => {
        const peerConnection =
          createPeerConnection(
            sender
          );

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            offer
          )
        );

        const answer =
          await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(
          answer
        );

        socket.emit("answer", {
          target: sender,
          answer,
        });
      }
    );

    // ========================================
    // ANSWER
    // ========================================

    socket.on(
      "answer",
      async ({
        answer,
      }) => {
        const peerConnection =
          peerConnectionRef.current;

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            answer
          )
        );
      }
    );

    // ========================================
    // ICE CANDIDATE
    // ========================================

    socket.on(
      "ice-candidate",
      async ({
        candidate,
      }) => {
        try {
          const peerConnection =
            peerConnectionRef.current;

          if (!peerConnection) {
            return;
          }

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );
        } catch (error) {
          console.error(
            "ICE candidate error:",
            error
          );
        }
      }
    );

    // ========================================
    // CHAT MESSAGE
    // ========================================

    socket.on(
      "receive-message",
      (newMessage) => {
        setMessages(
          (previousMessages) => [
            ...previousMessages,
            newMessage,
          ]
        );
      }
    );
    // ========================================
// LIVE TRANSCRIPT
// ========================================

// ========================================
// LIVE TRANSCRIPT
// ========================================

socket.on(
  "transcript-update",
  (newTranscript) => {
    console.log(
      "Live transcript received:",
      newTranscript
    );

    setTranscripts((previous) => [
      ...previous,
      {
        _id:
          `live-${Date.now()}-${Math.random()}`,
        speaker:
          newTranscript.speaker,
        text:
          newTranscript.text,
        timestamp:
          newTranscript.timestamp ||
          new Date().toISOString(),
        isLive: true,
      },
    ]);
  }
);

// ========================================
// REAL-TIME ACTION ITEM UPDATE
// ========================================

socket.on(
  "action-item-updated",
  (updatedItem) => {
    console.log(
      "Action item updated:",
      updatedItem
    );

    setActionItems((previousItems) =>
      previousItems.map((item) =>
        item._id === updatedItem._id
          ? updatedItem
          : item
      )
    );
  }
);

// ========================================
// CHAT HISTORY
// ========================================
    // ========================================
    // CHAT HISTORY
    // ========================================

    socket.on(
      "message-history",
      (history) => {
        setMessages(history);
      }
    );

    // ========================================
    // USER LEFT
    // ========================================

    socket.on(
      "user-left",
      (user) => {
        console.log(
          `${user.userName} left`
        );

        setRemoteConnected(false);
        setRemoteUser(null);
        setRemoteOnline(false);

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject =
            null;
        }

        if (
          peerConnectionRef.current
        ) {
          peerConnectionRef.current.close();

          peerConnectionRef.current =
            null;
        }

        peerTargetRef.current = null;
      }
    );

    socket.on(
      "disconnect",
      () => {
        setConnected(false);
      }
    );
  };

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const sendMessage = (event) => {
    event.preventDefault();

    const trimmedMessage =
      message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit(
      "send-message",
      {
        roomId,
        message: trimmedMessage,
        sender: senderName,
      }
    );

    setMessage("");
  };

  // ==========================================
  // LOAD SAVED TRANSCRIPTS
  // ==========================================

  const loadSavedTranscripts = async () => {
    try {
      const token =
        localStorage.getItem("token");

      if (!token || !roomId) {
        return;
      }

      const response =
        await axios.get(
          `${API_URL}/transcripts/${roomId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (response.data.success) {
        console.log(
          "Saved transcripts:",
          response.data.transcripts
        );

        setTranscripts(
          response.data.transcripts || []
        );
      }
    } catch (error) {
      console.error(
        "Failed to load transcripts:",
        error.response?.data ||
          error.message
      );
    }
  };

  // ==========================================
  // SAVE TRANSCRIPT TO MONGODB
  // ==========================================

  const saveTranscriptToDatabase = async (text) => {
  try {
    const token =
      localStorage.getItem("token");

    if (
      !token ||
      !text ||
      !text.trim()
    ) {
      return;
    }

    const cleanText = text.trim();

    const response = await axios.post(
      `${API_URL}/transcripts`,
      {
        meetingRoomId: roomId,
        text: cleanText,
        speaker: senderName,
      },
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    if (response.data.success) {
      const savedTranscript =
        response.data.transcript;

      // Add to current user's transcript
      setTranscripts(
        (previous) => [
          ...previous,
          savedTranscript,
        ]
      );

      // Broadcast to other participants
      if (socketRef.current) {
        socketRef.current.emit(
          "transcript-update",
          {
            roomId,
            speaker: senderName,
            text: cleanText,
            timestamp:
              savedTranscript.timestamp ||
              new Date().toISOString(),
          }
        );
      }

      console.log(
        "Transcript saved and broadcast:",
        savedTranscript
      );
    }
  } catch (error) {
    console.error(
      "Save transcript error:",
      error.response?.data ||
        error.message
    );
  }
};
  // ==========================================
  // LOAD MEETING DETAILS / REAL HOST
  // ==========================================

// ==========================================
// LOAD MEETING DETAILS / REAL HOST
// ==========================================

const loadMeetingDetails = async () => {
  try {
    const token =
      localStorage.getItem("token");

    if (!token || !roomId) {
      setMeetingAccessError(
        "Invalid meeting information."
      );

      setMeetingLoading(false);
      return false;
    }

    const response = await axios.get(
      `${API_URL}/meetings/${roomId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success) {
      const meeting =
        response.data.meeting;

      setMeetingDetails(meeting);
      setMeetingLoading(false);

      console.log(
        "Meeting details loaded:",
        meeting
      );

      return true;
    }

    setMeetingAccessError(
      "Unable to access this meeting."
    );

    setMeetingLoading(false);

    return false;

  } catch (error) {
    console.error(
      "Load meeting details error:",
      error.response?.data ||
        error.message
    );

    const status =
      error.response?.status;

    const serverMessage =
      error.response?.data?.message;

    if (status === 410) {
      setMeetingExpired(true);

      setMeetingAccessError(
        serverMessage ||
          "This meeting has ended and the Meeting ID is no longer active."
      );
    } else if (status === 404) {
      setMeetingExpired(true);

      setMeetingAccessError(
        serverMessage ||
          "This Meeting ID is invalid or no longer exists."
      );
    } else {
      setMeetingAccessError(
        serverMessage ||
          "Unable to access this meeting."
      );
    }

    setMeetingLoading(false);

    return false;
  }
};

  useEffect(() => {
    loadMeetingDetails();
  }, [roomId]);

  // ==========================================
  // GENERATE AI MEETING INSIGHTS
  // ==========================================

  const generateAIInsights = async () => {
    try {
      if (!isMeetingHost) {
        setAiError("Only the meeting host can access AI Meeting Insights.");
        return;
      }
      const token =
        localStorage.getItem("token");

      if (!token) {
        setAiError(
          "Authentication token not found. Please log in again."
        );
        return;
      }

      if (!roomId) {
        setAiError(
          "Meeting room ID is missing."
        );
        return;
      }



      setGeneratingInsights(true);
      setAiError("");

      const response = await axios.get(
        `${API_URL}/ai/meeting/${roomId}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

if (response.data.success) {
  const insights =
    response.data.insights;

  setAiInsights(insights);
  setSavedAIInsights(insights);

  // Reload action items created by AI
  await loadActionItems();

  console.log(
    "AI insights generated successfully:",
    insights
  );
} else {
        setAiError(
          response.data.message ||
            "Failed to generate AI insights."
        );
      }
    } catch (error) {
      console.error(
        "Generate AI insights error:",
        error.response?.data ||
          error.message
      );

      setAiError(
        error.response?.data?.message ||
          "Failed to generate AI insights. Please try again."
      );
    } finally {
      setGeneratingInsights(false);
    }
  };
const loadSavedAIInsights = async () => {
  try {
    const token =
      localStorage.getItem("token");

    if (!token || !roomId) {
      return null;
    }

    setLoadingSavedInsights(true);

    const response = await axios.get(
      `${API_URL}/ai/meeting/${roomId}/saved`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

if (response.data.success) {
  const insights =
    response.data.insights;

  setAiInsights(insights);
  setSavedAIInsights(insights);

  // Reload action items created by AI
  await loadActionItems();

  console.log(
    "AI insights generated successfully:",
    insights
  );
} else {
  setAiError(
    response.data.message ||
      "Failed to generate AI insights."
  );
}

    return null;
  } catch (error) {
    if (error.response?.status === 404) {
      setSavedAIInsights(null);
      setAiInsights(null);
    } else {
      console.error(
        "Load saved AI insights error:",
        error.response?.status,
        error.response?.data ||
          error.message
      );
    }

    return null;
  } finally {
    setLoadingSavedInsights(false);
  }
};

const loadActionItems = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token || !roomId) {
      return;
    }

    setLoadingActionItems(true);
    setActionItemError("");

    const response = await axios.get(
      `${API_URL}/action-items/meeting/${roomId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success) {
      setActionItems(
        response.data.actionItems || []
      );

      console.log(
        "Action items loaded:",
        response.data.actionItems
      );
    }
  } catch (error) {
    console.error(
      "Load action items error:",
      error.response?.data ||
        error.message
    );

    setActionItemError(
      error.response?.data?.message ||
        "Failed to load action items."
    );
  } finally {
    setLoadingActionItems(false);
  }
};

useEffect(() => {
  if (!roomId) {
    return;
  }

  loadActionItems();
}, [roomId]);

  // ==========================================
  // LIVE TRANSCRIPTION
  // ==========================================

  const startTranscription = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Live transcription is not supported by this browser. Please use Google Chrome."
      );

      return;
    }

    if (recognitionRef.current) {
      return;
    }

    try {
      const recognition =
        new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        console.log(
          "Transcription started"
        );

        setTranscribing(true);
        setError("");
      };

      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {
          const result =
            event.results[i];

          if (result.isFinal) {
            finalText +=
              result[0].transcript;
          } else {
            interimText +=
              result[0].transcript;
          }
        }

        // ====================================
        // UPDATE REACT TRANSCRIPT
        // ====================================

        if (finalText.trim()) {
          const cleanText =
            finalText.trim();

          setTranscript(
            (previous) => {
              const separator =
                previous &&
                !previous.endsWith(" ")
                  ? " "
                  : "";

              return (
                previous +
                separator +
                cleanText
              );
            }
          );

          // ==================================
          // SAVE FINAL RESULT TO MONGODB
          // ==================================

          saveTranscriptToDatabase(
            cleanText
          );
        }

        if (interimText) {
          console.log(
            "Interim transcript:",
            interimText
          );
        }
      };

      recognition.onerror = (event) => {
        console.error(
          "Speech recognition error:",
          event.error
        );

        if (
          event.error ===
          "not-allowed"
        ) {
          setError(
            "Microphone permission is required for transcription."
          );
        } else if (
          event.error ===
          "no-speech"
        ) {
          console.log(
            "No speech detected."
          );
        } else if (
          event.error !==
          "aborted"
        ) {
          setError(
            "Transcription encountered an error."
          );
        }

        setTranscribing(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        console.log(
          "Transcription ended"
        );

        setTranscribing(false);
        recognitionRef.current = null;
      };

      recognitionRef.current =
        recognition;

      recognition.start();
    } catch (error) {
      console.error(
        "Unable to start transcription:",
        error
      );

      setTranscribing(false);
      recognitionRef.current = null;

      setError(
        "Unable to start live transcription."
      );
    }
  };

  // ==========================================
  // STOP TRANSCRIPTION
  // ==========================================

  const stopTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setTranscribing(false);
  };

  // ==========================================
  // AI INSIGHTS OUTSIDE CLICK
  // ==========================================

  useEffect(() => {
    const handleAIInsightsOutsideClick = (event) => {
      if (
        aiInsightsPanelRef.current &&
        !aiInsightsPanelRef.current.contains(event.target)
      ) {
        setAiInsights(null);
        setAiError("");
      }
    };

    if (aiInsights || aiError || generatingInsights) {
      document.addEventListener(
        "mousedown",
        handleAIInsightsOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleAIInsightsOutsideClick
      );
    };
  }, [aiInsights, aiError, generatingInsights]);

  // ==========================================
  // TRANSCRIPTION OUTSIDE CLICK
  // ==========================================

  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        transcriptionPanelRef.current &&
        !transcriptionPanelRef.current.contains(
          event.target
        )
      ) {
        setShowTranscriptionPanel(
          false
        );
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // ==========================================
  // LOAD SAVED TRANSCRIPTS
  // ==========================================

  useEffect(() => {
    loadSavedTranscripts();
  }, [roomId]);

  // ==========================================
  // AUTO SCROLL CHAT
  // ==========================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  // ==========================================
  // CAMERA OFF
  // ==========================================

  const turnCameraOff = () => {
    if (!streamRef.current) {
      setCameraOn(false);
      return;
    }

    const videoTracks =
      streamRef.current.getVideoTracks();

    videoTracks.forEach((track) => {
      track.stop();

      streamRef.current.removeTrack(
        track
      );
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        streamRef.current;
    }

    const peerConnection =
      peerConnectionRef.current;

    if (peerConnection) {
      const sender =
        peerConnection
          .getSenders()
          .find(
            (sender) =>
              sender.track &&
              sender.track.kind ===
                "video"
          );

      if (sender) {
        sender.replaceTrack(null);
      }
    }

    setCameraOn(false);
  };

  // ==========================================
  // CAMERA ON
  // ==========================================

  const turnCameraOn = async () => {
    try {
      setError("");

      const cameraStream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: true,
          }
        );

      const newVideoTrack =
        cameraStream.getVideoTracks()[0];

      if (!newVideoTrack) {
        return;
      }

      if (!streamRef.current) {
        streamRef.current =
          new MediaStream();
      }

      streamRef.current.addTrack(
        newVideoTrack
      );

      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          streamRef.current;
      }

      const peerConnection =
        peerConnectionRef.current;

      if (peerConnection) {
        const sender =
          peerConnection
            .getSenders()
            .find(
              (sender) =>
                sender.track &&
                sender.track.kind ===
                  "video"
            );

        if (sender) {
          await sender.replaceTrack(
            newVideoTrack
          );
        } else {
          peerConnection.addTrack(
            newVideoTrack,
            streamRef.current
          );

          await renegotiatePeerConnection();
        }
      }

      setCameraOn(true);
    } catch (error) {
      console.error(
        "Camera restart error:",
        error
      );

      setError(
        "Unable to turn on the camera. Please check camera permissions."
      );
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      turnCameraOff();
    } else {
      await turnCameraOn();
    }
  };

  // ==========================================
  // SCREEN SHARE
  // ==========================================

  const stopScreenShare = async () => {
    const screenStream =
      screenStreamRef.current;

    if (screenStream) {
      screenStream
        .getTracks()
        .forEach((track) => {
          track.onended = null;
          track.stop();
        });

      screenStreamRef.current = null;
    }

    const stream =
      streamRef.current;

    if (!stream) {
      setScreenSharing(false);
      return;
    }

    const screenTrack =
      stream
        .getVideoTracks()
        .find(
          (track) =>
            track.kind === "video"
        );

    if (screenTrack) {
      stream.removeTrack(
        screenTrack
      );

      if (
        screenTrack.readyState !==
        "ended"
      ) {
        screenTrack.stop();
      }
    }

    let cameraTrack =
      stream
        .getVideoTracks()
        .find(
          (track) =>
            track.kind === "video"
        );

    if (cameraOn && !cameraTrack) {
      try {
        const cameraStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
            }
          );

        cameraTrack =
          cameraStream.getVideoTracks()[0];

        if (cameraTrack) {
          stream.addTrack(
            cameraTrack
          );
        }
      } catch (error) {
        console.error(
          "Camera restore error:",
          error
        );

        setCameraOn(false);

        setError(
          "Screen sharing stopped, but the camera could not be restored."
        );
      }
    }

    const peerConnection =
      peerConnectionRef.current;

    if (peerConnection) {
      const videoSender =
        peerConnection
          .getSenders()
          .find(
            (sender) =>
              sender.track &&
              sender.track.kind ===
                "video"
          );

      if (videoSender) {
        await videoSender.replaceTrack(
          cameraTrack || null
        );
      } else if (cameraTrack) {
        peerConnection.addTrack(
          cameraTrack,
          stream
        );

        await renegotiatePeerConnection();
      }
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        stream;
    }

    setScreenSharing(false);
  };

  const startScreenShare =
    async () => {
      if (screenSharing) {
        await stopScreenShare();
        return;
      }

      try {
        setError("");

        if (
          !navigator.mediaDevices
            ?.getDisplayMedia
        ) {
          setError(
            "Screen sharing is not supported by this browser."
          );

          return;
        }

        const screenStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: {
                cursor: "always",
              },
              audio: false,
            }
          );

        const screenTrack =
          screenStream.getVideoTracks()[0];

        if (!screenTrack) {
          return;
        }

        screenStreamRef.current =
          screenStream;

        screenTrack.onended = () => {
          stopScreenShare();
        };

        if (!streamRef.current) {
          streamRef.current =
            new MediaStream();
        }

        const stream =
          streamRef.current;

        const existingVideoTracks =
          stream.getVideoTracks();

        existingVideoTracks.forEach(
          (track) => {
            stream.removeTrack(track);

            if (
              track !== screenTrack
            ) {
              track.stop();
            }
          }
        );

        stream.addTrack(
          screenTrack
        );

        if (localVideoRef.current) {
          localVideoRef.current.srcObject =
            stream;
        }

        const peerConnection =
          peerConnectionRef.current;

        if (peerConnection) {
          const videoSender =
            peerConnection
              .getSenders()
              .find(
                (sender) =>
                  sender.track &&
                  sender.track.kind ===
                    "video"
              );

          if (videoSender) {
            await videoSender.replaceTrack(
              screenTrack
            );
          } else {
            peerConnection.addTrack(
              screenTrack,
              stream
            );

            await renegotiatePeerConnection();
          }
        }

        setScreenSharing(true);
        setCameraOn(true);
      } catch (error) {
        console.error(
          "Screen sharing error:",
          error
        );

        if (
          error.name !==
          "NotAllowedError"
        ) {
          setError(
            "Unable to start screen sharing. Please try again."
          );
        }
      }
    };

  // ==========================================
  // MICROPHONE
  // ==========================================

  const toggleMic = () => {
    if (!streamRef.current) {
      return;
    }

    const audioTrack =
      streamRef.current.getAudioTracks()[0];

    if (!audioTrack) {
      return;
    }

    audioTrack.enabled =
      !audioTrack.enabled;

    setMicOn(
      audioTrack.enabled
    );
  };

  // ==========================================
  // STOP MEDIA
  // ==========================================

  const stopMedia = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setTranscribing(false);
    setShowTranscriptionPanel(false);

    if (screenStreamRef.current) {
      screenStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.onended = null;
          track.stop();
        });

      screenStreamRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject =
        null;
    }

    setCameraOn(false);
    setMicOn(false);
    setScreenSharing(false);
    setRemoteConnected(false);
  };

  // ==========================================
  // CLOSE WEBRTC
  // ==========================================

  const closePeerConnection = () => {
    if (
      peerConnectionRef.current
    ) {
      peerConnectionRef.current.close();

      peerConnectionRef.current =
        null;
    }

    peerTargetRef.current = null;
  };

  // ==========================================
  // DISCONNECT SOCKET
  // ==========================================

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();

      socketRef.current = null;
    }
  };

  // ==========================================
  // INITIALIZE MEETING
  // ==========================================

  useEffect(() => {
  let mounted = true;

  const initializeMeeting =
    async () => {

      // First verify that the Meeting ID
      // is still active.
      const allowed =
        await loadMeetingDetails();

      if (!allowed || !mounted) {
        return;
      }

      // Only start camera/microphone
      // after meeting access is verified.
      const stream =
        await startMedia();

      if (
        stream &&
        mounted
      ) {
        connectSocket();
      }
    };

  initializeMeeting();

  return () => {
    mounted = false;

    stopMedia();
    closePeerConnection();
    disconnectSocket();
  };
}, [roomId]);
  // ==========================================
  // PAGE EXIT
  // ==========================================

  useEffect(() => {
    const cleanup = () => {
      stopMedia();
      closePeerConnection();
      disconnectSocket();
    };

    window.addEventListener(
      "beforeunload",
      cleanup
    );

    window.addEventListener(
      "pagehide",
      cleanup
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        cleanup
      );

      window.removeEventListener(
        "pagehide",
        cleanup
      );
    };
  }, []);

  // ==========================================
  // LEAVE MEETING
  // ==========================================

  const leaveMeeting = () => {
    stopMedia();
    closePeerConnection();
    disconnectSocket();

    navigate("/dashboard", {
      replace: true,
    });
  };

  // ==========================================
  // PARTICIPANT COUNT
  // ==========================================

  const participantCount =
    remoteConnected ? 2 : 1;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="meeting-room">
      {meetingLoading && (
  <div className="meeting-access-screen">
    <div className="meeting-access-card">
      <div className="meeting-access-icon">
        🔄
      </div>

      <h2>Checking Meeting</h2>

      <p>
        Verifying your meeting access...
      </p>
    </div>
  </div>
)}

{!meetingLoading && meetingExpired && (
  <div className="meeting-access-screen">
    <div className="meeting-access-card expired">
      <div className="meeting-access-icon">
        🔒
      </div>

      <h2>Meeting Ended</h2>

      <p>
        {meetingAccessError ||
          "This meeting has ended and is no longer available."}
      </p>

      <span className="meeting-access-subtext">
        The Meeting ID has expired and cannot be
        used to join this meeting.
      </span>

      <button
        className="meeting-access-button"
        onClick={() =>
          navigate("/dashboard", {
            replace: true,
          })
        }
      >
        Back to Dashboard
      </button>
    </div>
  </div>
)}
      {/* HEADER */}

      <header className="meeting-room-header">

  <button onClick={leaveMeeting}>
    <ArrowLeft size={18} />

  </button>

  <div className="meeting-room-title">
    <Video size={20} />

    <span>
      {hostName !== "Host"
        ? `${hostName}'s Meeting`
        : "IntellMeet"}
    </span>
  </div>

  <div className="room-status">

    {/* Live clock */}
    <div className="meeting-live-clock">
      <span className="clock-time">
        {currentTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>

      <span className="clock-date">
        {currentTime.toLocaleDateString([], {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
    </div>
    {/* Connection status */}
    <div className="connection-status">
      <span
        className={
          connected
            ? "status-dot connected"
            : "status-dot"
        }
      />

      <span>
        {connected
          ? "Connected"
          : "Connecting..."}
      </span>
    </div>

  </div>

</header>

      {/* MAIN */}

      <main className="meeting-room-content">

        {error && (
          <div className="media-error">
            {error}
          </div>
        )}

        {/* VIDEO GRID */}

        <div className="video-grid">

          {/* REMOTE VIDEO */}

          <div className="video-container remote-video-container">

            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
            />

            {!remoteConnected && (
              <div className="camera-off">

                <Video size={42} />

                <p>
                  Waiting for another
                  participant...
                </p>

              </div>
            )}

            {remoteConnected && (
              <div className="video-label">
                {remoteUser?.userName || "Participant"}
                {remoteUser?.userName === hostName ? " · Host" : ""}
              </div>
            )}

          </div>

          {/* LOCAL VIDEO */}

          <div className="video-container local-video-container">

            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />

            {!cameraOn && (
              <div className="camera-off">

                <VideoOff size={42} />

                <p>
                  Camera is off
                </p>

              </div>
            )}

            <div className="video-label">
              {screenSharing
                ? `${senderName} · Screen Sharing`
                : `${senderName}${isMeetingHost ? " · Host" : ""}`}
            </div>

          </div>

        </div>

        {/* PARTICIPANTS PANEL */}

        {/* PARTICIPANTS PANEL */}

{participantsOpen && (
  <aside className="chat-panel">

    <div className="chat-header">
      <div>
        <Users size={18} />

        <span>
          Participants ({participantCount})
        </span>
      </div>

      <button
        className="chat-close"
        onClick={() =>
          setParticipantsOpen(false)
        }
      >
        <X size={18} />
      </button>
    </div>

    <div className="chat-messages">

      {/* ================================
          HOST - ALWAYS FIRST
      ================================= */}

      {hostId && (
        <div className="participant-item">

          <div className="participant-avatar">
            {hostName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="participant-info">
            <strong>
              {hostName}
              {isMeetingHost ? " (You)" : ""}
            </strong>

            <span>
              Host
            </span>
          </div>

          <span
            className={
              isMeetingHost ||
              (
                remoteUser?.userName ===
                  hostName &&
                remoteOnline
              )
                ? "participant-online"
                : "participant-offline"
            }
          />

        </div>
      )}

      {/* ================================
          CURRENT USER - PARTICIPANT
      ================================= */}

      {!isMeetingHost && user && (
        <div className="participant-item">

          <div className="participant-avatar">
            {senderName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="participant-info">
            <strong>
              {senderName}
            </strong>

            <span>
              You · Participant
            </span>
          </div>

          <span className="participant-online" />

        </div>
      )}

      {/* ================================
          REMOTE PARTICIPANT
      ================================= */}

      {remoteUser &&
        remoteUser.userName &&
        remoteUser.userName !== hostName && (
          <div className="participant-item">

            <div className="participant-avatar">
              {remoteUser.userName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="participant-info">
              <strong>
                {remoteUser.userName}
              </strong>

              <span>
                Participant
              </span>
            </div>

            <span
              className={
                remoteOnline
                  ? "participant-online"
                  : "participant-offline"
              }
            />

          </div>
        )}

    </div>

  </aside>
)}

        {/* CHAT PANEL */}

        {chatOpen && (
          <aside className="chat-panel">

            <div className="chat-header">

              <div>
                <MessageSquare size={18} />

                <span>
                  Meeting Chat
                </span>
              </div>

              <button
                className="chat-close"
                onClick={() =>
                  setChatOpen(false)
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="chat-messages">

              {messages.length === 0 && (
                <div className="empty-chat">

                  <MessageSquare
                    size={30}
                  />

                  <p>
                    No messages yet
                  </p>

                  <span>
                    Start a conversation
                  </span>

                </div>
              )}

              {messages.map(
                (item, index) => (
                  <div
                    key={
                      item.id ||
                      `${item.timestamp}-${index}`
                    }
                    className={
                      item.sender ===
                      senderName
                        ? "chat-message own"
                        : "chat-message"
                    }
                  >

                    <div className="message-sender">
                      {item.sender}
                    </div>

                    <div className="message-text">
                      {item.message}
                    </div>

                    <div className="message-time">
                      {new Date(
                        item.timestamp
                      ).toLocaleTimeString(
                        [],
                        {
                          hour:
                            "2-digit",
                          minute:
                            "2-digit",
                        }
                      )}
                    </div>

                  </div>
                )
              )}

              <div
                ref={
                  messagesEndRef
                }
              />

            </div>

            <form
              className="chat-input-area"
              onSubmit={
                sendMessage
              }
            >

              <input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
              />

              <button
                type="submit"
                disabled={
                  !message.trim()
                }
              >
                <Send size={18} />
              </button>

            </form>

          </aside>
        )}

        {/* TRANSCRIPTION PANEL */}

        {showTranscriptionPanel && (
          <aside
            ref={
              transcriptionPanelRef
            }
            className="transcription-panel"
          >

            <div className="transcription-header">

              <div>
                <Mic size={18} />

                <span>
                  Live Transcription
                </span>
              </div>

              <span
                className={
                  transcribing
                    ? "transcription-status active"
                    : "transcription-status"
                }
              >
                {transcribing
                  ? "Listening..."
                  : "Stopped"}
              </span>

            </div>

            <div className="transcription-content">

              {/* SAVED TRANSCRIPTS */}

              {transcripts.length > 0 && (
                <div className="saved-transcripts">

                  {transcripts.map(
                    (item) => (
                      <div
                        key={item._id}
                        className="transcript-item"
                      >

                        <div className="transcript-speaker">

                          <strong>
                            {item.speaker ||
                              item.user?.name ||
                              "Unknown"}
                          </strong>

                          <small>
                            {item.timestamp
                              ? new Date(
                                  item.timestamp
                                ).toLocaleTimeString(
                                  [],
                                  {
                                    hour:
                                      "2-digit",
                                    minute:
                                      "2-digit",
                                  }
                                )
                              : ""}
                          </small>

                        </div>

                        <p>
                          {item.text}
                        </p>

                      </div>
                    )
                  )}

                </div>
              )}

              {/* CURRENT LIVE TRANSCRIPT */}

              {transcript && (
                <div className="current-transcript">

                  <strong>
                    {senderName}
                  </strong>

                  <p>
                    {transcript}
                  </p>

                </div>
              )}

              {/* EMPTY STATE */}

              {!transcripts.length &&
                !transcript && (
                  <div className="transcription-empty">

                    <Mic size={28} />

                    <p>
                      Listening for speech...
                    </p>

                    <span>
                      Start speaking to generate
                      the transcript.
                    </span>

                  </div>
                )}

            </div>

            <div className="transcription-actions">

              {transcribing ? (
                <button
                  type="button"
                  className="stop-transcription"
                  onClick={
                    stopTranscription
                  }
                >
                  <MicOff size={16} />
                  Stop Transcription
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    startTranscription
                  }
                >
                  <Mic size={16} />
                  Start Transcription
                </button>
              )}

            </div>

          </aside>
        )}

        {/* AI INSIGHTS PANEL */}

        {(aiInsights || aiError || generatingInsights) && (
          <aside
            ref={aiInsightsPanelRef}
            className="ai-insights-panel"
          >

            <div className="ai-insights-header">
              <div>
                <Sparkles size={18} />
                <span>AI Meeting Insights</span>
              </div>

              <button
                  type="button"
                  className="ai-insights-close"
                  onClick={() => {
                    setAiInsights(null);
                    setAiError("");
                  }}
                  title="Close AI insights"
                >
                  <X size={18} />
                </button>
            </div>

            {generatingInsights && (
              <div className="ai-insights-loading">
                <Sparkles size={22} />
                <p>
                  Gemini is analyzing the meeting transcript...
                </p>
              </div>
            )}

            {aiError && !generatingInsights && (
              <div className="ai-insights-error">
                {aiError}
              </div>
            )}

            {aiInsights && !generatingInsights && (
              <div className="ai-insights-content">

                <section className="ai-insight-section">
                  <h3>Summary</h3>
                  <p>
                    {aiInsights.summary ||
                      "No summary available."}
                  </p>
                </section>

                <section className="ai-insight-section">
                  <h3>Key Points</h3>

                  {aiInsights.keyPoints?.length > 0 ? (
                    <ul>
                      {aiInsights.keyPoints.map(
                        (point, index) => (
                          <li key={index}>
                            {point}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="ai-empty">
                      No key points identified.
                    </p>
                  )}
                </section>

                <section className="ai-insight-section">
                  <h3>Decisions</h3>

                  {aiInsights.decisions?.length > 0 ? (
                    <ul>
                      {aiInsights.decisions.map(
                        (decision, index) => (
                          <li key={index}>
                            {decision}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="ai-empty">
                      No decisions identified.
                    </p>
                  )}
                </section>

                <section className="ai-insight-section">
                  <h3>Action Items</h3>

                  {aiInsights.actionItems?.length > 0 ? (
                    <div className="ai-action-items">
                      {aiInsights.actionItems.map(
                        (item, index) => (
                          <div
                            className="ai-action-item"
                            key={index}
                          >
                            <strong>
                              {item.task ||
                                "Untitled task"}
                            </strong>

                            <div className="ai-action-meta">
                              <span>
                                Assignee:{" "}
                                {item.assignee ||
                                  "Unassigned"}
                              </span>

                              <span>
                                Priority:{" "}
                                {item.priority ||
                                  "medium"}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="ai-empty">
                      No action items identified.
                    </p>
                  )}
                </section>

              </div>
            )}

          </aside>
        )}
{/* ACTION ITEMS PANEL */}

{showActionItems && actionItems.length > 0 && (
  <aside className="action-items-panel">

    <div className="action-items-header">
      <div>
        <Sparkles size={18} />
        <span>Action Items</span>
      </div>
    </div>

    {actionItemError && (
      <div className="action-items-error">
        {actionItemError}
      </div>
    )}

    {loadingActionItems ? (
      <div className="action-items-loading">
        Loading action items...
      </div>
    ) : (
      <div className="action-items-content">

        {actionItems.map((item) => (
          <div
            className="action-item-card"
            key={item._id}
          >

            <div className="action-item-task">
              <strong>
                {item.task}
              </strong>
            </div>

            <div className="action-item-meta">

              <span>
                Assignee:{" "}
                {item.assignee || "Unassigned"}
              </span>

              <span>
                Priority:{" "}
                {item.priority || "medium"}
              </span>

            </div>

            <select
              value={item.status}
              onChange={async (event) => {
                try {
                  const token =
                    localStorage.getItem("token");

                  const response =
                    await axios.put(
                      `${API_URL}/action-items/${item._id}`,
                      {
                        status:
                          event.target.value,
                      },
                      {
                        headers: {
                          Authorization:
                            `Bearer ${token}`,
                        },
                      }
                    );

                  if (response.data.success) {
                    setActionItems(
                      (previousItems) =>
                        previousItems.map(
                          (actionItem) =>
                            actionItem._id ===
                            item._id
                              ? response.data
                                  .actionItem
                              : actionItem
                        )
                    );
                  }
                } catch (error) {
                  console.error(
                    "Update action item error:",
                    error.response?.data ||
                      error.message
                  );
                }
              }}
              className="action-item-status"
            >
              <option value="pending">
                Pending
              </option>

              <option value="in-progress">
                In Progress
              </option>

              <option value="completed">
                Completed
              </option>
            </select>

          </div>
        ))}

      </div>
    )}

  </aside>
)}
        {/* CONTROLS */}

        <div className="meeting-controls">

          {/* CAMERA */}

          <button
            className={
              cameraOn
                ? "control-button"
                : "control-button off"
            }
            onClick={
              toggleCamera
            }
            title={
              cameraOn
                ? "Turn camera off"
                : "Turn camera on"
            }
          >
            {cameraOn ? (
              <Video size={21} />
            ) : (
              <VideoOff size={21} />
            )}
          </button>

          {/* MICROPHONE */}

          <button
            className={
              micOn
                ? "control-button"
                : "control-button off"
            }
            onClick={
              toggleMic
            }
            title={
              micOn
                ? "Mute microphone"
                : "Unmute microphone"
            }
          >
            {micOn ? (
              <Mic size={21} />
            ) : (
              <MicOff size={21} />
            )}
          </button>

          {/* SCREEN SHARE */}

          <button
            className={
              screenSharing
                ? "control-button active"
                : "control-button"
            }
            onClick={
              startScreenShare
            }
            title={
              screenSharing
                ? "Stop screen sharing"
                : "Share your screen"
            }
          >
            <MonitorUp size={21} />
          </button>

          {/* TRANSCRIPTION */}

          <button
            className={
              showTranscriptionPanel
                ? "control-button active"
                : "control-button"
            }
            onClick={() => {
              if (
                showTranscriptionPanel
              ) {
                setShowTranscriptionPanel(
                  false
                );

                return;
              }

              setShowTranscriptionPanel(
                true
              );

              if (!transcribing) {
                startTranscription();
              }
            }}
            title={
              showTranscriptionPanel
                ? "Hide transcription"
                : "Show transcription"
            }
          >
  <AudioLines size={21} />

          </button>

          {/* CHAT */}

          <button
            className={
              chatOpen
                ? "control-button active"
                : "control-button"
            }
            onClick={() => {
              setChatOpen(
                !chatOpen
              );

              setParticipantsOpen(
                false
              );
            }}
            title="Meeting chat"
          >
            <MessageSquare
              size={21}
            />
          </button>

          {/* PARTICIPANTS */}

          <button
            className={
              participantsOpen
                ? "control-button active"
                : "control-button"
            }
            onClick={() => {
              setParticipantsOpen(
                !participantsOpen
              );

              setChatOpen(false);
            }}
            title="Participants"
          >
            <Users size={21} />
          </button>

                 {/* AI INSIGHTS */}

<button
  className={
    generatingInsights
      ? "control-button active"
      : "control-button"
  }
 onClick={async () => {
  // HOST: always generate fresh AI insights
  if (isMeetingHost) {
    await generateAIInsights();
    return;
  }

  // PARTICIPANT: load the latest saved insights
  const latestInsights =
    await loadSavedAIInsights();

  if (latestInsights) {
    setAiInsights(latestInsights);
    setAiError("");
  } else {
    setAiError(
      "AI insights have not been generated by the host yet."
    );
  }
}}
  disabled={
    generatingInsights ||
    loadingSavedInsights
  }
  title={
    generatingInsights
      ? "Generating AI insights"
      : loadingSavedInsights
        ? "Loading AI insights"
        : savedAIInsights
          ? "View AI meeting insights"
          : isMeetingHost
            ? "Generate AI meeting insights"
            : "View AI meeting insights"
  }
>
  <Sparkles size={21} />
</button>
          

          {/* ACTION ITEMS */}

          <button
            className={
              showActionItems
                ? "control-button active"
                : "control-button"
            }
            onClick={() =>
              setShowActionItems(
                (previous) => !previous
              )
            }
            disabled={
              actionItems.length === 0
            }
            title={
              actionItems.length === 0
                ? "No action items available"
                : showActionItems
                  ? "Hide action items"
                  : "Show action items"
            }
          >
            <ListChecks size={21} />
          </button>

          {/* LEAVE */}

          <button
            className="leave-button"
            onClick={
              leaveMeeting
            }
          >
            Leave
          </button>

        </div>

      </main>

    </div>
  );
}

export default MeetingRoom;