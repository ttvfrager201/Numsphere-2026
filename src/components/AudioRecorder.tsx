"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mic, Square, Play, Pause, Trash2, Upload } from "lucide-react";
import { createClient } from "../../supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AudioRecorderProps {
  onRecordingComplete: (audioUrl: string) => void;
  currentAudioUrl?: string;
  label?: string;
}

export default function AudioRecorder({
  onRecordingComplete,
  currentAudioUrl,
  label = "Audio Recording",
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(currentAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setAudioUrl(currentAudioUrl || null);
  }, [currentAudioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the same mime type that was used for recording
        const blobType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Recording failed",
        description: error.message || "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const playRecording = () => {
    if (audioUrl && audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl && audioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const uploadRecording = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Determine file extension and content type based on the blob type
      const timestamp = Date.now();
      let fileExt = "webm";
      let contentType = "audio/webm";
      
      // Check the blob's mime type to determine extension
      if (audioBlob.type.includes("mp4")) {
        fileExt = "mp4";
        contentType = "audio/mp4";
      } else if (audioBlob.type.includes("ogg")) {
        fileExt = "ogg";
        contentType = "audio/ogg";
      }
      
      const fileName = `audio_${timestamp}.${fileExt}`;
      const file = new File([audioBlob], fileName, { type: contentType });

      // Upload to Supabase Storage - path should NOT include bucket name
      const filePath = `${user.id}/${timestamp}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("call-flow-audio")
        .upload(filePath, file, {
          contentType: contentType,
          upsert: false,
        });

      if (uploadError) {
        // Try creating the bucket if it doesn't exist
        if (uploadError.message.includes("Bucket not found")) {
          // Create bucket via API
          const response = await fetch("/api/audio/ensure-bucket", {
            method: "POST",
          });
          if (!response.ok) {
            throw new Error("Failed to create storage bucket");
          }
          // Retry upload
          const { error: retryError } = await supabase.storage
            .from("call-flow-audio")
            .upload(filePath, file, {
              contentType: contentType,
              upsert: false,
            });
          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("call-flow-audio").getPublicUrl(filePath);

      // Clean up blob URL
      if (audioUrl && audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(publicUrl);
      onRecordingComplete(publicUrl);

      toast({
        title: "Audio uploaded!",
        description: "Your recording has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload audio",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      
      {/* Recording Controls */}
      {!audioUrl && (
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <Button
              type="button"
              onClick={startRecording}
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={stopRecording}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
              {isPaused ? (
                <Button
                  type="button"
                  onClick={resumeRecording}
                  size="sm"
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={pauseRecording}
                  size="sm"
                  variant="outline"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              <span className="text-sm text-gray-600 font-mono">
                {formatTime(recordingTime)}
              </span>
            </>
          )}
        </div>
      )}

      {/* Playback Controls */}
      {audioUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={playRecording}
              size="sm"
              variant="outline"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              type="button"
              onClick={deleteRecording}
              size="sm"
              variant="outline"
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            {audioUrl.startsWith("blob:") && (
              <Button
                type="button"
                onClick={uploadRecording}
                size="sm"
                disabled={isUploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Save Recording"}
              </Button>
            )}
          </div>
          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          {audioUrl && !audioUrl.startsWith("blob:") && (
            <p className="text-xs text-green-600">✓ Audio saved</p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {audioUrl
          ? "Audio recording is ready. You can re-record if needed."
          : "Click to record audio. This will be used instead of text-to-speech."}
      </p>
    </div>
  );
}
