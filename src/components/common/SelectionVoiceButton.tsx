import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SelectionPosition = {
  x: number;
  y: number;
  text: string;
};

const UZ_UNITS = [
  "nol",
  "bir",
  "ikki",
  "uch",
  "to'rt",
  "besh",
  "olti",
  "yetti",
  "sakkiz",
  "to'qqiz",
];

const UZ_TENS = [
  "",
  "o'n",
  "yigirma",
  "o'ttiz",
  "qirq",
  "ellik",
  "oltmish",
  "yetmish",
  "sakson",
  "to'qson",
];

const UZ_SCALES = ["", "ming", "million", "milliard", "trillion"];

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const threeDigitsToUzbek = (n: number): string => {
  if (n === 0) return "";

  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const tens = Math.floor(rest / 10);
  const units = rest % 10;

  if (hundreds > 0) {
    if (hundreds === 1) {
      parts.push("bir", "yuz");
    } else {
      parts.push(UZ_UNITS[hundreds], "yuz");
    }
  }

  if (tens > 0) {
    parts.push(UZ_TENS[tens]);
  }

  if (units > 0) {
    parts.push(UZ_UNITS[units]);
  }

  return parts.join(" ").trim();
};

const numberToUzbekWords = (numText: string): string => {
  const clean = numText.replace(/[\s_]/g, "");
  if (!clean) return numText;

  const isNegative = clean.startsWith("-");
  const unsigned = isNegative ? clean.slice(1) : clean;

  const decimalSeparatorIndex = unsigned.search(/[.,]/);
  const integerPartText =
    decimalSeparatorIndex >= 0
      ? unsigned.slice(0, decimalSeparatorIndex)
      : unsigned;
  const decimalPartText =
    decimalSeparatorIndex >= 0 ? unsigned.slice(decimalSeparatorIndex + 1) : "";

  if (!/^\d+$/.test(integerPartText || "0")) {
    return numText;
  }

  let n = Number(integerPartText || "0");
  if (!Number.isFinite(n)) {
    return numText;
  }

  if (n === 0) {
    const decimalWords = decimalPartText
      ? ` butun ${decimalPartText
          .split("")
          .map((d) => UZ_UNITS[Number(d)] ?? d)
          .join(" ")}`
      : "";
    return `${isNegative ? "minus " : ""}nol${decimalWords}`.trim();
  }

  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const groupValue = groups[i];
    if (!groupValue) continue;

    const chunk = threeDigitsToUzbek(groupValue);
    const scale = UZ_SCALES[i] || "";
    if (chunk) {
      words.push(chunk);
    }
    if (scale) {
      words.push(scale);
    }
  }

  let result = words.join(" ").trim();

  if (decimalPartText && /^\d+$/.test(decimalPartText)) {
    const decimalWords = decimalPartText
      .split("")
      .map((d) => UZ_UNITS[Number(d)] ?? d)
      .join(" ");
    result = `${result} butun ${decimalWords}`;
  }

  if (isNegative) {
    result = `minus ${result}`;
  }

  return result;
};

const localizeNumbersForSpeech = (text: string): string => {
  // Sana, vaqt, ID kabi tokenlar (masalan 2026-07-09, 10:30) ichidagi bo'laklarni
  // minus sifatida o'qib yubormaslik uchun qat'iy chegaralar bilan tekshiramiz.
  return text.replace(
    /(^|[^\d/:.-])(-?\d+(?:[.,]\d+)?)(?=$|[^\d/:.-])/g,
    (_match, prefix: string, value: string) => `${prefix}${numberToUzbekWords(value)}`,
  );
};

const normalizeUzbekSpeechText = (text: string) => {
  return text
    .normalize("NFKC")
    .replace(/[ʻʼ`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};

const pickUzbekVoice = (voices: SpeechSynthesisVoice[]) => {
  if (!voices.length) return null;

  const byExactLang = voices.find(
    (voice) => voice.lang.toLowerCase() === "uz-uz",
  );
  if (byExactLang) return byExactLang;

  const byUzLang = voices.find((voice) => voice.lang.toLowerCase().startsWith("uz"));
  if (byUzLang) return byUzLang;

  const byUzName = voices.find((voice) => /uzbek|o'zbek|ozbek/i.test(voice.name));
  if (byUzName) return byUzName;

  return null;
};

const pickPreferredVoice = (voices: SpeechSynthesisVoice[]) => {
  const uzVoice = pickUzbekVoice(voices);
  if (uzVoice) return uzVoice;

  const fallbackByLang = voices.find((voice) => /^(tr|ru|en)/i.test(voice.lang));
  if (fallbackByLang) return fallbackByLang;

  return voices[0] || null;
};

const STORAGE_KEY = "selection_voice_name";

const getVoicePool = (voices: SpeechSynthesisVoice[]) => {
  const byPriority = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    if (lang.startsWith("uz") || /uzbek|o'zbek|ozbek/.test(name)) return 0;
    if (lang.startsWith("tr")) return 1;
    if (lang.startsWith("ru")) return 2;
    if (lang.startsWith("en")) return 3;
    return 4;
  };

  return [...voices].sort((a, b) => byPriority(a) - byPriority(b));
};

const SelectionVoiceButton = () => {
  const [selection, setSelection] = useState<SelectionPosition | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voicePool, setVoicePool] = useState<SpeechSynthesisVoice[]>([]);

  const speechSupported = useMemo(() => {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }, []);

  useEffect(() => {
    if (!speechSupported) return;

    const updateSelection = () => {
      const selected = window.getSelection();

      if (!selected || selected.rangeCount === 0 || selected.isCollapsed) {
        setSelection(null);
        return;
      }

      const text = selected.toString().trim();
      if (!text) {
        setSelection(null);
        return;
      }

      const range = selected.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelection(null);
        return;
      }

      const x = clamp(rect.right + 8, 8, window.innerWidth - 48);
      const y = clamp(rect.bottom + 8, 8, window.innerHeight - 48);

      setSelection({ x, y, text });
    };

    const clearOnPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-selection-voice-button='true']")) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener("selectionchange", updateSelection);
    document.addEventListener("mouseup", updateSelection);
    document.addEventListener("keyup", updateSelection);
    window.addEventListener("scroll", updateSelection, true);
    window.addEventListener("resize", updateSelection);
    document.addEventListener("pointerdown", clearOnPointerDown);

    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      document.removeEventListener("mouseup", updateSelection);
      document.removeEventListener("keyup", updateSelection);
      window.removeEventListener("scroll", updateSelection, true);
      window.removeEventListener("resize", updateSelection);
      document.removeEventListener("pointerdown", clearOnPointerDown);
      window.speechSynthesis.cancel();
    };
  }, [speechSupported]);

  useEffect(() => {
    if (!speechSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const pool = getVoicePool(voices);
      setVoicePool(pool);

      const storedVoiceName = localStorage.getItem(STORAGE_KEY);
      const selectedFromStorage = storedVoiceName
        ? pool.find((voice) => voice.name === storedVoiceName)
        : null;

      const nextVoice = selectedFromStorage || pickPreferredVoice(pool);
      setPreferredVoice(nextVoice);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [speechSupported]);

  const handleSwitchVoice = () => {
    if (!voicePool.length) return;

    const currentIndex = preferredVoice
      ? voicePool.findIndex((voice) => voice.name === preferredVoice.name)
      : -1;
    const nextIndex = (currentIndex + 1) % voicePool.length;
    const nextVoice = voicePool[nextIndex];

    setPreferredVoice(nextVoice);
    localStorage.setItem(STORAGE_KEY, nextVoice.name);
  };

  const handleSpeak = () => {
    if (!selection?.text || !speechSupported) return;

    const speechText = normalizeUzbekSpeechText(
      localizeNumbersForSpeech(selection.text),
    );
    const utterance = new SpeechSynthesisUtterance(speechText);

    if (preferredVoice) {
      utterance.lang = preferredVoice.lang;
      utterance.voice = preferredVoice;
    } else {
      utterance.lang = "uz-UZ";
    }

    utterance.rate = 0.62;
    utterance.pitch = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSelection(null);
  };

  if (!speechSupported || !selection?.text) {
    return null;
  }

  return (
    <div
      data-selection-voice-button="true"
      className="fixed z-[120] flex items-center gap-2"
      style={{ left: selection.x, top: selection.y }}
    >
      <Button
        type="button"
        size="icon"
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleSpeak}
        title={
          isSpeaking
            ? "Gapirilmoqda..."
            : "Matnni o'qish"
        }
        aria-label={
          isSpeaking
            ? "Gapirilmoqda"
            : "Matnni o'qish"
        }
        className="shadow-lg"
      >
        <Volume2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="secondary"
        disabled={voicePool.length <= 1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleSwitchVoice}
        title={
          preferredVoice
            ? `Voice: ${preferredVoice.name} (${preferredVoice.lang})`
            : "Voice almashtirish"
        }
        aria-label="Voice almashtirish"
        className="shadow-lg"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SelectionVoiceButton;