"""Audio Transcription Service using OpenAI Whisper"""
import os
import tempfile
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Lazy-load OpenAI client
_openai_client = None


def get_openai_client():
    """Get or create OpenAI client."""
    global _openai_client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    if _openai_client is None:
        try:
            from openai import OpenAI
            _openai_client = OpenAI(api_key=api_key)
        except Exception as e:
            logger.warning(f"Could not initialize OpenAI client: {e}")
            return None
    return _openai_client


class TranscriptionService:
    """Handles audio transcription using OpenAI Whisper API"""
    
    def __init__(self):
        self.model = "whisper-1"
    
    async def transcribe_audio(
        self,
        audio_file_path: str,
        language: str = "en",
        response_format: str = "verbose_json"
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using Whisper API.
        
        Args:
            audio_file_path: Path to audio file (mp3, mp4, mpeg, mpga, m4a, wav, webm)
            language: ISO-639-1 language code
            response_format: json, text, srt, verbose_json, vtt
            
        Returns:
            Dict with transcription text and segments
        """
        client = get_openai_client()
        
        if not client:
            logger.warning("OpenAI client not available, using mock transcription")
            return self._mock_transcription(audio_file_path)
        
        try:
            with open(audio_file_path, "rb") as audio_file:
                response = client.audio.transcriptions.create(
                    model=self.model,
                    file=audio_file,
                    language=language,
                    response_format=response_format,
                    timestamp_granularities=["segment", "word"]
                )
            
            # Parse response based on format
            if response_format == "verbose_json":
                return {
                    "text": response.text,
                    "segments": [
                        {
                            "start": seg.start,
                            "end": seg.end,
                            "text": seg.text,
                            "confidence": getattr(seg, "confidence", None)
                        }
                        for seg in (response.segments or [])
                    ],
                    "language": getattr(response, "language", language),
                    "duration": getattr(response, "duration", 0)
                }
            else:
                return {"text": str(response), "segments": [], "duration": 0}
                
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            # Return mock data on failure for demo
            return self._mock_transcription(audio_file_path)
    
    async def transcribe_from_url(self, audio_url: str) -> Dict[str, Any]:
        """Download audio from URL and transcribe"""
        import httpx
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(audio_url)
            response.raise_for_status()
            
            # Save to temp file
            suffix = audio_url.split(".")[-1].split("?")[0]
            with tempfile.NamedTemporaryFile(suffix=f".{suffix}", delete=False) as f:
                f.write(response.content)
                temp_path = f.name
        
        try:
            result = await self.transcribe_audio(temp_path)
            return result
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def _mock_transcription(self, audio_file_path: str) -> Dict[str, Any]:
        """Mock transcription for demo/development"""
        return {
            "text": """Good morning Nicole, thanks for coming in today. I wanted to go over your portfolio performance this quarter and discuss any concerns you might have.

Thank you for meeting with me. I've been a bit worried about the market volatility lately, especially with my retirement getting closer.

I completely understand. Let's look at your current allocation. You're at about 60% equities and 40% fixed income, which is appropriate for your timeline. The volatility you're seeing is normal market behavior.

That makes sense. I've also been thinking about my daughter's college fund. She'll be starting in about two years.

Great point. We should review the 529 allocation and perhaps shift to a more conservative mix given the shorter timeline. I'll put together some options for our next meeting.

That would be helpful. Also, my husband mentioned something about tax-loss harvesting. Is that something we should consider?

Absolutely. Looking at your taxable account, there are some positions with unrealized losses that we could harvest to offset gains. Let me run the analysis and we can discuss specific trades.

Perfect. One more thing - my mother is moving in with us and I want to make sure our estate plan is up to date.

That's a significant life event. I'll connect you with our estate planning partner to review beneficiaries and any necessary updates. Is there anything else on your mind?

No, I think that covers everything. Thank you for being so thorough.

Of course. I'll send a summary email with the action items and we'll schedule a follow-up in a few weeks.""",
            "segments": [
                {"speaker": "Advisor", "start": 0.0, "end": 15.0, "text": "Good morning Nicole, thanks for coming in today. I wanted to go over your portfolio performance this quarter and discuss any concerns you might have."},
                {"speaker": "Client", "start": 15.0, "end": 28.0, "text": "Thank you for meeting with me. I've been a bit worried about the market volatility lately, especially with my retirement getting closer."},
                {"speaker": "Advisor", "start": 28.0, "end": 52.0, "text": "I completely understand. Let's look at your current allocation. You're at about 60% equities and 40% fixed income, which is appropriate for your timeline. The volatility you're seeing is normal market behavior."},
                {"speaker": "Client", "start": 52.0, "end": 65.0, "text": "That makes sense. I've also been thinking about my daughter's college fund. She'll be starting in about two years."},
                {"speaker": "Advisor", "start": 65.0, "end": 85.0, "text": "Great point. We should review the 529 allocation and perhaps shift to a more conservative mix given the shorter timeline. I'll put together some options for our next meeting."},
                {"speaker": "Client", "start": 85.0, "end": 100.0, "text": "That would be helpful. Also, my husband mentioned something about tax-loss harvesting. Is that something we should consider?"},
                {"speaker": "Advisor", "start": 100.0, "end": 125.0, "text": "Absolutely. Looking at your taxable account, there are some positions with unrealized losses that we could harvest to offset gains. Let me run the analysis and we can discuss specific trades."},
                {"speaker": "Client", "start": 125.0, "end": 140.0, "text": "Perfect. One more thing - my mother is moving in with us and I want to make sure our estate plan is up to date."},
                {"speaker": "Advisor", "start": 140.0, "end": 165.0, "text": "That's a significant life event. I'll connect you with our estate planning partner to review beneficiaries and any necessary updates. Is there anything else on your mind?"},
                {"speaker": "Client", "start": 165.0, "end": 175.0, "text": "No, I think that covers everything. Thank you for being so thorough."},
                {"speaker": "Advisor", "start": 175.0, "end": 190.0, "text": "Of course. I'll send a summary email with the action items and we'll schedule a follow-up in a few weeks."},
            ],
            "language": "en",
            "duration": 190.0
        }


class SpeakerDiarizationService:
    """
    Speaker diarization to identify who said what.
    Uses pyannote.audio or similar for speaker identification.
    """
    
    def __init__(self):
        self.use_cloud = os.getenv("DIARIZATION_SERVICE", "mock")
    
    async def identify_speakers(
        self,
        audio_path: str,
        num_speakers: Optional[int] = None,
        participant_names: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Identify speakers in audio and return diarized segments.
        
        Returns:
            List of segments with speaker labels
            [{speaker: "Speaker 1", start: 0.0, end: 5.2}, ...]
        """
        if self.use_cloud == "assemblyai":
            return await self._diarize_assemblyai(audio_path, num_speakers)
        else:
            return await self._mock_diarization(audio_path, participant_names)
    
    async def _mock_diarization(
        self,
        audio_path: str,
        participant_names: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Mock diarization for development"""
        names = participant_names or ["Advisor", "Client"]
        # Return mock segments alternating speakers
        return [
            {"speaker": names[0], "start": 0.0, "end": 15.0},
            {"speaker": names[1] if len(names) > 1 else "Client", "start": 15.0, "end": 28.0},
            {"speaker": names[0], "start": 28.0, "end": 52.0},
            {"speaker": names[1] if len(names) > 1 else "Client", "start": 52.0, "end": 65.0},
            {"speaker": names[0], "start": 65.0, "end": 85.0},
            {"speaker": names[1] if len(names) > 1 else "Client", "start": 85.0, "end": 100.0},
            {"speaker": names[0], "start": 100.0, "end": 125.0},
            {"speaker": names[1] if len(names) > 1 else "Client", "start": 125.0, "end": 140.0},
            {"speaker": names[0], "start": 140.0, "end": 165.0},
            {"speaker": names[1] if len(names) > 1 else "Client", "start": 165.0, "end": 175.0},
            {"speaker": names[0], "start": 175.0, "end": 190.0},
        ]
    
    async def _diarize_assemblyai(
        self,
        audio_path: str,
        num_speakers: Optional[int]
    ) -> List[Dict[str, Any]]:
        """Use AssemblyAI for diarization"""
        try:
            import assemblyai as aai
            
            aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")
            
            config = aai.TranscriptionConfig(
                speaker_labels=True,
                speakers_expected=num_speakers
            )
            
            transcriber = aai.Transcriber()
            transcript = transcriber.transcribe(audio_path, config=config)
            
            segments = []
            for utterance in transcript.utterances:
                segments.append({
                    "speaker": f"Speaker {utterance.speaker}",
                    "start": utterance.start / 1000,  # Convert ms to seconds
                    "end": utterance.end / 1000,
                    "text": utterance.text
                })
            
            return segments
        except Exception as e:
            logger.error(f"AssemblyAI diarization failed: {e}")
            return await self._mock_diarization(audio_path, None)


def merge_transcription_with_diarization(
    transcription: Dict[str, Any],
    diarization: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Merge Whisper transcription segments with speaker diarization.
    
    Aligns text segments with speaker labels based on timestamps.
    """
    # If transcription already has speaker labels (from mock), return as-is
    if transcription.get("segments") and transcription["segments"][0].get("speaker"):
        return transcription["segments"]
    
    merged = []
    
    for trans_seg in transcription.get("segments", []):
        # Find overlapping diarization segment
        seg_mid = (trans_seg["start"] + trans_seg["end"]) / 2
        
        speaker = "Unknown"
        for diar_seg in diarization:
            if diar_seg["start"] <= seg_mid <= diar_seg["end"]:
                speaker = diar_seg["speaker"]
                break
        
        merged.append({
            "speaker": speaker,
            "start": trans_seg["start"],
            "end": trans_seg["end"],
            "text": trans_seg["text"],
            "confidence": trans_seg.get("confidence")
        })
    
    return merged


# Singleton instance
transcription_service = TranscriptionService()
diarization_service = SpeakerDiarizationService()
