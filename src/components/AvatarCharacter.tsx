import React from 'react';
import { AvatarId, AvatarMood, EmotionTag } from '../types';
import { Saathi2DAvatar } from './avatar2d/Saathi2DAvatar';

interface AvatarCharacterProps {
  avatarId: AvatarId;
  mood?: AvatarMood;
  emotion?: EmotionTag;
  isTalking?: boolean;
  isListening?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  showRing?: boolean;
}

export const AvatarCharacter: React.FC<AvatarCharacterProps> = ({
  avatarId,
  mood = 'smiling',
  emotion,
  isTalking = false,
  isListening = false,
  size = 'md',
  className = '',
}) => {
  // Map mood to EmotionTag if emotion is not explicitly provided
  const effectiveEmotion: EmotionTag = emotion || (
    mood === 'concerned'
      ? 'serious'
      : mood === 'laughing'
      ? 'happy'
      : mood === 'caring'
      ? 'caring'
      : 'calm'
  );

  return (
    <Saathi2DAvatar
      characterId={avatarId}
      size={size}
      emotion={effectiveEmotion}
      isSpeaking={isTalking}
      isListening={isListening}
      className={className}
    />
  );
};
