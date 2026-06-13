import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

interface UseSpeechRecognitionOptions {
  lang?: string;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  toggle: (baseText?: string) => void;
  stop: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Доступ к микрофону запрещён. Разрешите его в настройках браузера.",
  "no-speech": "Ничего не услышал. Попробуй ещё раз.",
  "audio-capture": "Микрофон не найден или занят другим приложением.",
  "network": "Проблема с сетью при распознавании речи.",
  "aborted": "",
};

export function useSpeechRecognition(
  onTranscript: (text: string) => void,
  { lang = "ru-RU" }: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>("");
  const finalAccumRef = useRef<string>("");

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(
    (baseText = "") => {
      if (!isSupported) {
        toast.error("Голосовой ввод не поддерживается в этом браузере");
        return;
      }

      if (isListening) {
        stop();
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = true;

      baseTextRef.current = baseText;
      finalAccumRef.current = "";

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        let interimText = "";
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            newFinal += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (newFinal) {
          finalAccumRef.current += newFinal;
        }

        const combined =
          (baseTextRef.current + " " + finalAccumRef.current + interimText).trim();
        onTranscript(combined);
      };

      recognition.onerror = (event: any) => {
        const msg = ERROR_MESSAGES[event.error] ?? `Ошибка распознавания: ${event.error}`;
        if (msg) toast.error(msg);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    },
    [isSupported, isListening, lang, onTranscript, stop, SpeechRecognition]
  );

  return { isSupported, isListening, toggle, stop };
}
