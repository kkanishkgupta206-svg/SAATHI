import React, { useEffect, useState, useMemo } from 'react';
import { AvatarId, EmotionTag } from '../../types';
import { VisemeShape } from '../../utils/speechSynthesisService';

export type AvatarMouthShape = 'closed' | 'small_open' | 'wide_open' | 'oo' | 'smile';

export interface Saathi2DAvatarProps {
  characterId: AvatarId;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  emotion?: EmotionTag;
  isSpeaking?: boolean;
  isListening?: boolean;
  isThinking?: boolean;
  viseme?: VisemeShape;
  mouthShape?: AvatarMouthShape;
  showGlow?: boolean;
  className?: string;
  forceReducedMotion?: boolean;
}

export const Saathi2DAvatar: React.FC<Saathi2DAvatarProps> = ({
  characterId,
  size = 'md',
  emotion = 'calm',
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  viseme,
  mouthShape: customMouthShape,
  showGlow = true,
  className = '',
  forceReducedMotion = false,
}) => {
  // Respect system prefers-reduced-motion
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setSystemReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const reducedMotion = forceReducedMotion || systemReducedMotion;

  // Blinking state: every 3 to 5 seconds
  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    if (reducedMotion) return;

    let timeoutId: any;
    let blinkDurationId: any;

    const scheduleNextBlink = () => {
      // Character specific blink cadence
      const delay = characterId === 'aneet'
        ? 4500 + Math.random() * 2000 // Aneet: slow warm blinks
        : characterId === 'rahul'
        ? 2800 + Math.random() * 1800 // Rahul: quick lively blinks
        : 3500 + Math.random() * 2000;

      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        blinkDurationId = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(blinkDurationId);
    };
  }, [reducedMotion, characterId]);

  // Speaking mouth shape animation
  const [speechMouthStep, setSpeechMouthStep] = useState<AvatarMouthShape>('closed');
  useEffect(() => {
    if (!isSpeaking) {
      setSpeechMouthStep('closed');
      return;
    }

    if (customMouthShape) {
      setSpeechMouthStep(customMouthShape);
      return;
    }

    // Map viseme to mouth shape if provided
    if (viseme) {
      switch (viseme) {
        case 'aa':
          setSpeechMouthStep('wide_open');
          return;
        case 'oh':
          setSpeechMouthStep('small_open');
          return;
        case 'ou':
          setSpeechMouthStep('oo');
          return;
        case 'ee':
        case 'ih':
          setSpeechMouthStep('smile');
          return;
        case 'closed':
        default:
          setSpeechMouthStep('small_open');
          return;
      }
    }

    // Speech amplitude / cadence simulator when speaking without explicit viseme
    const shapes: AvatarMouthShape[] = ['small_open', 'wide_open', 'smile', 'oo', 'small_open', 'closed'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % shapes.length;
      setSpeechMouthStep(shapes[idx]);
    }, 130);

    return () => clearInterval(interval);
  }, [isSpeaking, viseme, customMouthShape]);

  // Effective mouth shape
  const effectiveMouth: AvatarMouthShape = useMemo(() => {
    if (isSpeaking) {
      return speechMouthStep;
    }
    if (emotion === 'happy') return 'smile';
    return 'closed';
  }, [isSpeaking, speechMouthStep, emotion]);

  // Dimensions
  const sizeMap = {
    xs: 'w-10 h-10',
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
    hero: 'w-44 h-44 sm:w-52 sm:h-52',
  };

  // Character specific styling & background glow
  const theme = useMemo(() => {
    switch (characterId) {
      case 'raj':
        return {
          glowColor: 'rgba(59, 130, 246, 0.35)',
          bgGradientStart: '#2563EB',
          bgGradientEnd: '#1D4ED8',
          accentBg: 'from-blue-600 to-indigo-700',
          clothMain: '#1E3A8A', // Calm blue shirt
          clothCollar: '#3B82F6',
          clothAccent: '#93C5FD',
          hair: '#1E1B18',
          skinBase: '#F0B78B',
          skinShadow: '#D8986B',
          blush: '#E5987E',
          eyeColor: '#2B2520',
          badgeText: 'Supportive Big Brother',
        };
      case 'aneet':
        return {
          glowColor: 'rgba(251, 146, 60, 0.38)',
          bgGradientStart: '#EA580C',
          bgGradientEnd: '#DB2777',
          accentBg: 'from-rose-500 to-amber-600',
          clothMain: '#E11D48', // Warm peach / rose kurta
          clothCollar: '#FDA4AF',
          clothAccent: '#F59E0B',
          hair: '#171412',
          skinBase: '#F5C29E',
          skinShadow: '#DE9F75',
          blush: '#F472B6',
          eyeColor: '#231F20',
          badgeText: 'Patient & Caring Elder Sister',
        };
      case 'rahul':
        return {
          glowColor: 'rgba(163, 230, 53, 0.42)',
          bgGradientStart: '#65A30D',
          bgGradientEnd: '#0D9488',
          accentBg: 'from-amber-500 to-emerald-600',
          clothMain: '#0284C7', // Bright cricket T-shirt
          clothCollar: '#FBBF24',
          clothAccent: '#DC2626',
          hair: '#292524',
          skinBase: '#F6C39F',
          skinShadow: '#DE9F77',
          blush: '#FB7185',
          eyeColor: '#1C1917',
          badgeText: 'Playful Cricket Buddy',
        };
      case 'rani':
        return {
          glowColor: 'rgba(216, 180, 254, 0.45)',
          bgGradientStart: '#9333EA',
          bgGradientEnd: '#EC4899',
          accentBg: 'from-violet-500 to-pink-500',
          clothMain: '#F59E0B', // Colorful sunny dress
          clothCollar: '#EC4899',
          clothAccent: '#8B5CF6',
          hair: '#1E1B18',
          skinBase: '#F7C6A3',
          skinShadow: '#E0A27B',
          blush: '#F43F5E',
          eyeColor: '#4C1D95',
          badgeText: 'Sweet Art & Story Friend',
        };
      default:
        return {
          glowColor: 'rgba(20, 184, 166, 0.35)',
          bgGradientStart: '#0D9488',
          bgGradientEnd: '#059669',
          accentBg: 'from-teal-600 to-emerald-700',
          clothMain: '#0F766E',
          clothCollar: '#2DD4BF',
          clothAccent: '#99F6E4',
          hair: '#1E1B18',
          skinBase: '#F2B98E',
          skinShadow: '#D8986B',
          blush: '#E5987E',
          eyeColor: '#231F20',
          badgeText: 'Listening Companion',
        };
    }
  }, [characterId]);

  // CSS classes for character-specific movement personality
  const movementClass = useMemo(() => {
    if (reducedMotion) return '';
    if (isListening) return 'animate-avatar-listen-nod';
    if (isThinking) return 'animate-avatar-raj-steady';
    switch (characterId) {
      case 'raj':
        return 'animate-avatar-raj-steady';
      case 'aneet':
        return 'animate-avatar-aneet-tilt';
      case 'rahul':
        return 'animate-avatar-rahul-lively';
      case 'rani':
        return 'animate-avatar-rani-bouncy';
      default:
        return 'animate-avatar-raj-steady';
    }
  }, [characterId, reducedMotion, isListening, isThinking]);

  // Breathing movement class on the body layer
  const breathingClass = reducedMotion ? '' : 'animate-avatar-breathing';

  // Eyebrow vertical and tilt adjustments based on emotion & thinking
  const eyebrowTransform = useMemo(() => {
    if (isThinking) return 'translate(0, -1.2) rotate(-2, 100, 75)';
    switch (emotion) {
      case 'caring':
      case 'comforting':
        return 'translate(0, -1.8) rotate(3.2, 100, 75)'; // Soft warm raised inner corners
      case 'encouraging':
      case 'proud':
        return 'translate(0, -3.2) rotate(-2, 100, 75)'; // Arched high, enthusiastic
      case 'serious':
        return 'translate(0, 1.8) rotate(-3, 100, 75)'; // Lowered concerned
      case 'happy':
      case 'excited':
        return 'translate(0, -2.8)'; // High smiling arches
      case 'playful':
      case 'gentle-laughing':
        return 'translate(0, -2.2) rotate(1.5, 100, 75)';
      case 'curious':
      case 'surprised':
        return 'translate(0, -3.6) rotate(-1, 100, 75)';
      case 'thoughtful':
        return 'translate(0, -1.0) rotate(-2, 100, 75)';
      case 'worried':
      case 'sad-empathetic':
        return 'translate(0, 1.5) rotate(4, 100, 75)';
      case 'calm':
      default:
        return 'translate(0, 0)';
    }
  }, [emotion, isThinking]);

  // Head tilt based on emotion, listening, and thinking
  const headTransform = useMemo(() => {
    if (reducedMotion) return '';
    if (isListening) return 'rotate(1.5 100 100) translate(0 1.5)';
    if (isThinking) return 'rotate(2.2 100 100) translate(0 0.5)';
    switch (emotion) {
      case 'caring':
      case 'comforting':
        return 'rotate(2 100 100)';
      case 'happy':
      case 'excited':
        return 'rotate(-2 100 100) translate(0 -1)';
      case 'playful':
      case 'gentle-laughing':
        return 'rotate(2.8 100 100) translate(0 -0.8)';
      case 'encouraging':
      case 'proud':
        return 'rotate(1 100 100) translate(0 -1.5)';
      case 'curious':
      case 'surprised':
        return 'rotate(-2.5 100 100) translate(0 -1)';
      case 'thoughtful':
        return 'rotate(2 100 100) translate(0 0.5)';
      case 'worried':
      case 'sad-empathetic':
        return 'rotate(2.2 100 100) translate(0 1.0)';
      case 'serious':
        return 'rotate(0 100 100)';
      case 'calm':
      default:
        return 'rotate(0 100 100)';
    }
  }, [emotion, isListening, isThinking, reducedMotion]);

  // Eyes rendering depending on blinking, emotion, listening, and thinking
  const renderEyes = () => {
    if (isBlinking) {
      return (
        <g stroke="#1F2937" strokeWidth="2.8" strokeLinecap="round" fill="none">
          <path d="M 80 88 Q 88 92 96 88" />
          <path d="M 104 88 Q 112 92 120 88" />
        </g>
      );
    }

    const isJoyful = ['happy', 'excited', 'playful', 'gentle-laughing', 'proud'].includes(emotion);
    if (isJoyful && !isListening && !isThinking) {
      return (
        <g stroke="#1F2937" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M 78 89 Q 88 79 98 89" />
          <path d="M 102 89 Q 112 79 122 89" />
          {(characterId === 'aneet' || characterId === 'rani') && (
            <>
              <path d="M 98 89 L 100 87" strokeWidth="2" />
              <path d="M 122 89 L 124 87" strokeWidth="2" />
            </>
          )}
        </g>
      );
    }

    // Open eyes with pupil and catchlight
    const eyeRadiusX = characterId === 'rahul' || characterId === 'rani' ? 7.5 : 6.8;
    const eyeRadiusY = characterId === 'rahul' || characterId === 'rani' ? 8.0 : 6.8;
    const pupilRadius = characterId === 'rahul' || characterId === 'rani' ? 5.0 : 4.4;

    return (
      <g>
        {/* Left eye sclera */}
        <ellipse cx="88" cy="87" rx={eyeRadiusX} ry={eyeRadiusY} fill="#FFFFFF" />
        {/* Right eye sclera */}
        <ellipse cx="112" cy="87" rx={eyeRadiusX} ry={eyeRadiusY} fill="#FFFFFF" />

        {/* Iris / Pupils */}
        <circle
          cx={isListening ? 88.5 : isThinking ? 87.5 : 88}
          cy={isListening ? 87.5 : isThinking ? 85.8 : 87}
          r={pupilRadius}
          fill={theme.eyeColor}
        />
        <circle
          cx={isListening ? 112.5 : isThinking ? 111.5 : 112}
          cy={isListening ? 87.5 : isThinking ? 85.8 : 87}
          r={pupilRadius}
          fill={theme.eyeColor}
        />

        {/* Shiny Catchlights */}
        <circle cx={isThinking ? 86.5 : 86} cy={isThinking ? 84.0 : 84.5} r="2" fill="#FFFFFF" />
        <circle cx={isThinking ? 110.5 : 110} cy={isThinking ? 84.0 : 84.5} r="2" fill="#FFFFFF" />
        {(characterId === 'rahul' || characterId === 'rani') && (
          <>
            <circle cx="90" cy="88.5" r="1.1" fill="#FFFFFF" />
            <circle cx="114" cy="88.5" r="1.1" fill="#FFFFFF" />
          </>
        )}

        {/* Eyelash line for female characters */}
        {(characterId === 'aneet' || characterId === 'rani') && (
          <g stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M 80 85 Q 88 80 96 85" />
            <path d="M 104 85 Q 112 80 120 85" />
          </g>
        )}
      </g>
    );
  };

  // Mouth rendering based on mouth shape
  const renderMouth = () => {
    switch (effectiveMouth) {
      case 'wide_open':
        return (
          <g>
            <path d="M 91 113 Q 100 131 109 113 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M 94 113 Q 100 117 106 113" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <ellipse cx="100" cy="123" rx="4.5" ry="2.5" fill="#EF4444" />
          </g>
        );

      case 'small_open':
        return (
          <g>
            <ellipse cx="100" cy="116" rx="5.5" ry="4" fill="#B91C1C" stroke="#991B1B" strokeWidth="1.2" />
            <ellipse cx="100" cy="117.5" rx="3.2" ry="1.8" fill="#F87171" />
          </g>
        );

      case 'oo':
        return (
          <g>
            <circle cx="100" cy="116" r="4.2" fill="#991B1B" stroke="#7F1D1D" strokeWidth="1.2" />
            <circle cx="100" cy="116" r="2.2" fill="#F87171" />
          </g>
        );

      case 'smile':
        return (
          <g>
            <path d="M 90 113 Q 100 125 110 113" stroke="#991B1B" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Dimple accents */}
            <path d="M 88 112 L 89 114" stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 112 112 L 111 114" stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );

      case 'closed':
      default:
        if (emotion === 'serious') {
          return (
            <path d="M 93 116 Q 100 112 107 116" stroke="#9A3412" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          );
        }
        return (
          <path d="M 92 114 Q 100 120 108 114" stroke="#991B1B" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        );
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeMap[size]} ${className}`}
      style={{
        filter: showGlow ? `drop-shadow(0 6px 16px ${theme.glowColor})` : undefined,
      }}
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full overflow-hidden rounded-full shadow-inner select-none transition-transform duration-300"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radial glow background gradient */}
          <radialGradient id={`glow-${characterId}`} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="60%" stopColor={theme.bgGradientStart} stopOpacity="0.9" />
            <stop offset="100%" stopColor={theme.bgGradientEnd} stopOpacity="1" />
          </radialGradient>

          {/* Skin linear gradients */}
          <linearGradient id={`skin-${characterId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.skinBase} />
            <stop offset="100%" stopColor={theme.skinShadow} />
          </linearGradient>

          {/* Hair gradients */}
          <linearGradient id={`hair-${characterId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#37322F" />
            <stop offset="100%" stopColor={theme.hair} />
          </linearGradient>
        </defs>

        {/* ======================================================== */}
        {/* LAYER 1: BACKGROUND GLOW & DISC                          */}
        {/* ======================================================== */}
        <circle cx="100" cy="100" r="100" fill={`url(#glow-${characterId})`} />
        {/* Subtle decorative inner soft ring */}
        <circle cx="100" cy="100" r="95" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />

        {/* ======================================================== */}
        {/* LAYER 5: HAIR BACK (Aneet's long hair, Rani's braids)    */}
        {/* ======================================================== */}
        {characterId === 'aneet' && (
          <g id="hair-back-aneet">
            <path d="M 52 75 Q 40 135 50 195 L 75 198 Q 60 145 66 105 Z" fill="#171412" />
            <path d="M 148 75 Q 160 135 150 195 L 125 198 Q 140 145 134 105 Z" fill="#171412" />
          </g>
        )}

        {characterId === 'rani' && (
          <g id="hair-back-rani">
            {/* Left Braid */}
            <g>
              <ellipse cx="56" cy="112" rx="7" ry="6" fill="#1E1B18" />
              <ellipse cx="51" cy="125" rx="6.5" ry="5.5" fill="#1E1B18" />
              <ellipse cx="46" cy="138" rx="6" ry="5" fill="#1E1B18" />
              {/* Cute Pink Bow / Ribbon */}
              <circle cx="45" cy="145" r="4.5" fill="#EC4899" />
              <circle cx="41" cy="144" r="3.5" fill="#F472B6" />
              <circle cx="49" cy="144" r="3.5" fill="#F472B6" />
            </g>
            {/* Right Braid */}
            <g>
              <ellipse cx="144" cy="112" rx="7" ry="6" fill="#1E1B18" />
              <ellipse cx="149" cy="125" rx="6.5" ry="5.5" fill="#1E1B18" />
              <ellipse cx="154" cy="138" rx="6" ry="5" fill="#1E1B18" />
              {/* Ribbon */}
              <circle cx="155" cy="145" r="4.5" fill="#EC4899" />
              <circle cx="151" cy="144" r="3.5" fill="#F472B6" />
              <circle cx="159" cy="144" r="3.5" fill="#F472B6" />
            </g>
          </g>
        )}

        {/* ======================================================== */}
        {/* LAYER 2: BODY & CLOTHES (Subtle breathing movement)      */}
        {/* ======================================================== */}
        <g id="body-clothes-group" className={breathingClass} style={{ transformOrigin: '100px 180px' }}>
          {/* RAJ: Adult male shoulders, relaxed posture, casual blue shirt */}
          {characterId === 'raj' && (
            <g id="raj-clothes">
              {/* Broad relaxed shoulders */}
              <path d="M 32 200 L 32 186 Q 58 152 82 144 L 100 156 L 118 144 Q 142 152 168 186 L 168 200 Z" fill={theme.clothMain} />
              {/* V-neck collar & folds */}
              <path d="M 76 144 L 100 178 L 92 142 Z" fill="#2563EB" />
              <path d="M 124 144 L 100 178 L 108 142 Z" fill="#3B82F6" />
              {/* Inner comfortable shirt */}
              <path d="M 93 158 Q 100 162 107 158 L 105 174 L 95 174 Z" fill="#93C5FD" />
            </g>
          )}

          {/* ANEET: Adult female shoulders, warm peach / coral kurta */}
          {characterId === 'aneet' && (
            <g id="aneet-clothes">
              <path d="M 36 200 Q 56 154 84 144 L 100 166 L 116 144 Q 144 154 164 200 Z" fill={theme.clothMain} />
              {/* Elegant embroidered neckline */}
              <path d="M 84 144 Q 100 166 116 144" stroke="#FDE047" strokeWidth="3" fill="none" />
              <circle cx="100" cy="155" r="2.5" fill="#FACC15" />
              <circle cx="100" cy="168" r="2.2" fill="#FDE047" />
              {/* Subtle gold necklace */}
              <path d="M 88 135 Q 100 148 112 135" stroke="#FBBF24" strokeWidth="1.8" fill="none" />
            </g>
          )}

          {/* RAHUL: 12-year-old child shoulders, bright sporty T-shirt with cricket bat/ball */}
          {characterId === 'rahul' && (
            <g id="rahul-clothes">
              <path d="M 38 200 Q 64 156 86 148 L 100 166 L 114 148 Q 136 156 162 200 Z" fill={theme.clothMain} />
              {/* Sporty athletic collar stripe */}
              <path d="M 85 148 Q 100 166 115 148" stroke="#F59E0B" strokeWidth="3.5" fill="none" />
              {/* Small cricket bat & ball icon badge on chest */}
              <g transform="translate(93, 172)">
                <line x1="4" y1="18" x2="16" y2="2" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
                <circle cx="6" cy="6" r="3.5" fill="#DC2626" />
                <circle cx="5" cy="5" r="1.2" fill="#FFFFFF" />
              </g>
            </g>
          )}

          {/* RANI: 12-year-old child shoulders, colorful sunny dress with art sketchbook/pencil */}
          {characterId === 'rani' && (
            <g id="rani-clothes">
              <path d="M 38 200 Q 64 156 86 148 L 100 166 L 114 148 Q 136 156 162 200 Z" fill={theme.clothMain} />
              {/* Scalloped pink/purple neckline */}
              <path d="M 85 148 Q 100 164 115 148" stroke="#EC4899" strokeWidth="3" fill="none" />
              {/* Little sketchbook & pencil badge */}
              <g transform="translate(92, 172)">
                <rect x="3" y="4" width="14" height="18" rx="2" fill="#A855F7" />
                <rect x="5" y="7" width="10" height="12" rx="1" fill="#FFFFFF" />
                <line x1="16" y1="3" x2="21" y2="10" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            </g>
          )}
        </g>

        {/* ======================================================== */}
        {/* LAYER 3: NECK & HEAD GROUP (With Sway / Tilt / Nod Engine)*/}
        {/* ======================================================== */}
        <g id="head-neck-group" className={movementClass} style={{ transformOrigin: '100px 140px', transform: headTransform }}>
          
          {/* NECK */}
          <path
            d={
              characterId === 'raj'
                ? 'M 82 116 L 82 148 L 118 148 L 118 116 Z'
                : characterId === 'aneet'
                ? 'M 85 112 L 85 145 L 115 145 L 115 112 Z'
                : 'M 88 122 L 88 150 L 112 150 L 112 122 Z'
            }
            fill={`url(#skin-${characterId})`}
          />
          {/* Neck shadow under chin */}
          <ellipse cx="100" cy="120" rx="14" ry="4" fill={theme.skinShadow} opacity="0.6" />

          {/* HEAD / FACE SHAPE */}
          {characterId === 'raj' && (
            <g id="head-raj">
              {/* Adult defined jawline */}
              <path d="M 68 85 Q 68 136 100 138 Q 132 136 132 85 Q 132 46 100 46 Q 68 46 68 85 Z" fill={`url(#skin-${characterId})`} />
              {/* Light 5-o'clock stubble along jaw */}
              <path d="M 72 98 Q 72 135 100 137 Q 128 135 128 98 Q 120 120 100 123 Q 80 120 72 98 Z" fill="#884C32" opacity="0.25" />
              {/* Ears */}
              <circle cx="67" cy="90" r="8.5" fill={theme.skinShadow} />
              <circle cx="133" cy="90" r="8.5" fill={theme.skinShadow} />
            </g>
          )}

          {characterId === 'aneet' && (
            <g id="head-aneet">
              {/* Elegant oval face */}
              <path d="M 70 82 Q 70 134 100 136 Q 130 134 130 82 Q 130 45 100 45 Q 70 45 70 82 Z" fill={`url(#skin-${characterId})`} />
              {/* Delicate ears with gold studs */}
              <circle cx="68" cy="91" r="7.5" fill={theme.skinShadow} />
              <circle cx="132" cy="91" r="7.5" fill={theme.skinShadow} />
              <circle cx="68" cy="94" r="2.5" fill="#FACC15" />
              <circle cx="132" cy="94" r="2.5" fill="#FACC15" />
              {/* Small traditional red bindi */}
              <circle cx="100" cy="68" r="2.2" fill="#991B1B" />
            </g>
          )}

          {characterId === 'rahul' && (
            <g id="head-rahul">
              {/* Child round face with cute cheeks */}
              <circle cx="100" cy="95" r="37" fill={`url(#skin-${characterId})`} />
              {/* Rosy cheerful cheeks */}
              <circle cx="78" cy="105" r="8" fill={theme.blush} opacity="0.38" />
              <circle cx="122" cy="105" r="8" fill={theme.blush} opacity="0.38" />
              {/* Cute round ears */}
              <circle cx="62" cy="96" r="8.5" fill={theme.skinShadow} />
              <circle cx="138" cy="96" r="8.5" fill={theme.skinShadow} />
            </g>
          )}

          {characterId === 'rani' && (
            <g id="head-rani">
              {/* Sweet rounded girl face */}
              <circle cx="100" cy="95" r="37" fill={`url(#skin-${characterId})`} />
              {/* Rosy blush cheeks */}
              <circle cx="76" cy="104" r="8" fill={theme.blush} opacity="0.45" />
              <circle cx="124" cy="104" r="8" fill={theme.blush} opacity="0.45" />
              {/* Ears with cute clip/stud */}
              <circle cx="62" cy="96" r="8" fill={theme.skinShadow} />
              <circle cx="138" cy="96" r="8" fill={theme.skinShadow} />
              <circle cx="63" cy="98" r="2.2" fill="#F43F5E" />
              <circle cx="137" cy="98" r="2.2" fill="#F43F5E" />
            </g>
          )}

          {/* ======================================================== */}
          {/* LAYER 7: EYEBROWS (React to Gemini emotion tags)         */}
          {/* ======================================================== */}
          <g id="eyebrows-group" style={{ transform: eyebrowTransform, transformOrigin: '100px 75px' }}>
            {characterId === 'raj' && (
              <g stroke="#18181B" strokeWidth="3.2" strokeLinecap="round" fill="none">
                <path d="M 76 72 Q 86 68 95 72" />
                <path d="M 124 72 Q 114 68 105 72" />
              </g>
            )}

            {characterId === 'aneet' && (
              <g stroke="#1C1917" strokeWidth="2.4" strokeLinecap="round" fill="none">
                <path d="M 78 70 Q 87 65 95 70" />
                <path d="M 122 70 Q 113 65 105 70" />
              </g>
            )}

            {characterId === 'rahul' && (
              <g stroke="#292524" strokeWidth="2.8" strokeLinecap="round" fill="none">
                <path d="M 77 77 Q 85 71 93 77" />
                <path d="M 123 77 Q 115 71 107 77" />
              </g>
            )}

            {characterId === 'rani' && (
              <g stroke="#1C1917" strokeWidth="2.4" strokeLinecap="round" fill="none">
                <path d="M 77 76 Q 85 70 93 76" />
                <path d="M 123 76 Q 115 70 107 76" />
              </g>
            )}
          </g>

          {/* ======================================================== */}
          {/* LAYER 8: EYES & BLINKING                                 */}
          {/* ======================================================== */}
          <g id="eyes-group">{renderEyes()}</g>

          {/* ======================================================== */}
          {/* LAYER 9: NOSE                                            */}
          {/* ======================================================== */}
          {characterId === 'raj' && (
            <path d="M 98 84 Q 102 94 97 96 L 103 96" stroke="#B46E47" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          )}
          {characterId === 'aneet' && (
            <path d="M 99 82 Q 101 92 97 94 L 102 94" stroke="#B46E47" strokeWidth="2" strokeLinecap="round" fill="none" />
          )}
          {characterId === 'rahul' && (
            <circle cx="100" cy="99" r="2.6" fill="#C2410C" opacity="0.75" />
          )}
          {characterId === 'rani' && (
            <circle cx="100" cy="98" r="2.2" fill="#F43F5E" opacity="0.65" />
          )}

          {/* ======================================================== */}
          {/* LAYER 10: MOUTH & SPEECH LIP SYNC                        */}
          {/* ======================================================== */}
          <g id="mouth-group">{renderMouth()}</g>

          {/* ======================================================== */}
          {/* LAYER 6: HAIR FRONT (Neat sweep, bangs, locks)          */}
          {/* ======================================================== */}
          {characterId === 'raj' && (
            <g id="hair-front-raj">
              {/* Short neat adult hair */}
              <path d="M 64 80 Q 64 38 100 34 Q 136 38 136 80 Q 132 58 125 48 Q 105 44 80 47 Q 67 58 64 80 Z" fill={`url(#hair-${characterId})`} />
              {/* Side sweep texture */}
              <path d="M 74 48 Q 96 38 124 44 Q 112 48 94 48 Z" fill="#3F3F46" />
            </g>
          )}

          {characterId === 'aneet' && (
            <g id="hair-front-aneet">
              {/* Soft flowing hair framing face */}
              <path d="M 64 78 Q 62 38 100 35 Q 138 38 136 78 Q 128 54 118 46 Q 100 44 82 46 Q 72 54 64 78 Z" fill={`url(#hair-${characterId})`} />
              {/* Face-framing locks */}
              <path d="M 66 74 Q 68 114 74 134 Q 70 114 70 78 Z" fill="#292524" />
              <path d="M 134 74 Q 132 114 126 134 Q 130 114 130 78 Z" fill="#292524" />
            </g>
          )}

          {characterId === 'rahul' && (
            <g id="hair-front-rahul">
              {/* Messy, ruffled 12-year-old boy hair */}
              <path
                d="M 58 86 Q 54 44 98 42 Q 142 44 142 86 Q 138 68 132 56 L 126 62 Q 120 46 108 48 L 100 56 Q 94 46 84 50 L 78 60 Q 68 62 58 86 Z"
                fill={`url(#hair-${characterId})`}
              />
              {/* Fun messy tufts */}
              <path d="M 96 36 Q 102 28 108 34" stroke="#292524" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M 112 38 Q 118 32 124 40" stroke="#292524" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {characterId === 'rani' && (
            <g id="hair-front-rani">
              {/* Cute arched bangs */}
              <path d="M 60 86 Q 56 46 100 42 Q 144 46 140 86 Q 134 62 122 52 Q 100 48 78 52 Q 66 62 60 86 Z" fill={`url(#hair-${characterId})`} />
              <path d="M 72 58 Q 85 70 100 62 Q 115 70 128 58 Z" fill="#292524" />
              {/* Star Hair Clip */}
              <g transform="translate(126, 52) scale(0.9)">
                <circle cx="5" cy="5" r="4.5" fill="#FDE047" />
                <circle cx="5" cy="5" r="2.5" fill="#EC4899" />
              </g>
            </g>
          )}

        </g>
      </svg>

      {/* Online / Active status pulse indicator */}
      <span
        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white shadow-xs ${
          size === 'hero' ? 'w-5 h-5' : size === 'xl' || size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'
        } ${isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'}`}
        title={isSpeaking ? 'Speaking...' : isListening ? 'Listening attentively...' : 'Ready to listen'}
      />
    </div>
  );
};
