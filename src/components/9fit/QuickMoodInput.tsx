import { EmojiCalibrationQuiz } from './EmojiCalibrationQuiz';

/** A single calibration source across entry points; mood alone never completes the day. */
export function QuickMoodInput({ onLogged }: { onLogged?: () => void }) {
  return <div className="mx-4 mt-6"><EmojiCalibrationQuiz onComplete={() => onLogged?.()} /></div>;
}
