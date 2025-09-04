# Sound Files for Family Hub Playground

This directory contains sound effect files for the playground widgets:

- `click.mp3` - UI click sounds for TicTacToe moves
- `victory.mp3` - Victory trumpet for game wins  
- `draw.mp3` - Neutral ding for game draws
- `select.mp3` - Soft "boop" for hover/selection sounds
- `chime.mp3` - Musical chime for special events

## Usage

Sounds are played via the `playSound()` helper in `/src/lib/sound.ts` with volume set to 0.4 and respects the user's sound toggle preference stored in localStorage.

## Implementation Note

In this demo, we're using minimal placeholder sounds. In production, you would add actual MP3/WAV files here.