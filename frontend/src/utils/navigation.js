/**
 * EcoLogix Navigation & Turn-by-Turn Utilities with High-Fidelity Text-to-Speech (TTS)
 * Tailored for Driver Dashboard: Clear pronunciation, rate adjustments for cab noise,
 * natural voice selection, and corridor-aware navigation cues.
 */

// Voice cache
let cachedVoice = null;

function getBestVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prefer natural English voices (Google US English, Samantha, Microsoft Zira/David, Indian English)
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') ||
        v.name.includes('Google') ||
        v.name.includes('Neural') ||
        v.name.includes('Samantha') ||
        v.name.includes('Zira') ||
        v.name.includes('David') ||
        v.name.includes('India'))
  ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

  cachedVoice = preferred;
  return preferred;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    getBestVoice();
  };
}

/**
 * Speaks a navigation maneuver instruction using Web Speech Synthesis API.
 * @param {string} text - Instruction to speak
 * @param {object} options - Options { rate, pitch, volume, onEnd }
 */
export function speakInstruction(text, options = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    return;
  }

  if (!text || typeof text !== 'string') return;

  try {
    // Cancel any previous speech to avoid overlapping instructions
    window.speechSynthesis.cancel();

    // Clean text for speech: strip hashtags, codes, formatting symbols
    const cleanText = text
      .replace(/#\w+/g, '')
      .replace(/[➔→•]/g, 'to')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate || 0.95; // Slightly measured rate for driver clarity
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }

    if (typeof options.onEnd === 'function') {
      utterance.onend = options.onEnd;
    }

    utterance.onerror = (e) => {
      // Ignore canceled error which occurs when new instruction interrupts previous
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Speech synthesis utterance notice:', e.error);
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis playback notice:', err);
  }
}

/**
 * Stops all currently playing speech synthesis audio immediately.
 */
export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('Stop speech notice:', err);
    }
  }
}

/**
 * Generates turn-by-turn maneuvers from origin, destination, and waypoints.
 * Uses OSRM driving engine when online, or generates rich corridor-aware steps.
 */
export async function fetchTurnByTurnSteps(origin, destination, waypoints = []) {
  try {
    const allWaypoints = [origin, ...waypoints, destination].filter(
      (w) => w && typeof w.lat === 'number' && (typeof w.lng === 'number' || typeof w.lon === 'number')
    );

    if (allWaypoints.length < 2) {
      return generateCorridorSteps(origin, destination, waypoints);
    }

    const coordsStr = allWaypoints
      .map((w) => `${w.lng ?? w.lon},${w.lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?steps=true&overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal }).catch(() => null);
    clearTimeout(timeoutId);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.routes && data.routes.length > 0) {
        const legSteps = [];
        data.routes[0].legs.forEach((leg, legIdx) => {
          leg.steps.forEach((step, stepIdx) => {
            if (step.maneuver && step.maneuver.type !== 'arrive') {
              const modifier = step.maneuver.modifier || '';
              const roadName = step.name || 'Freight Corridor Road';
              const dist = Math.round(step.distance);

              let instruction = '';
              if (modifier) {
                instruction = `In ${dist} meters, turn ${modifier} onto ${roadName}`;
              } else {
                instruction = `Continue on ${roadName} for ${dist} meters`;
              }

              legSteps.push({
                id: `step-${legIdx}-${stepIdx}`,
                instruction,
                distance: dist,
                type: step.maneuver.type || 'turn',
                modifier: modifier,
                location: step.maneuver.location,
              });
            }
          });
        });

        // Final destination arrival
        legSteps.push({
          id: 'step-arrive',
          instruction: `You have arrived at your destination: ${destination.name || 'Delivery Hub'}!`,
          distance: 0,
          type: 'arrive',
          modifier: '',
        });

        if (legSteps.length > 0) {
          return legSteps;
        }
      }
    }
  } catch (err) {
    console.warn('OSRM routing fetch notice, using realistic corridor steps:', err);
  }

  return generateCorridorSteps(origin, destination, waypoints);
}

/**
 * Fallback generator that produces realistic corridor navigation maneuvers
 * tailored for Guwahati and Assam regional freight corridors.
 */
function generateCorridorSteps(origin, destination, waypoints = []) {
  const origName = origin?.name || 'Betkuchi ISBT Freight Terminal';
  const destName = destination?.name || 'ICD Amingaon Container Depot';

  const steps = [
    {
      id: 'step-depart',
      instruction: `Depart from ${origName} and head toward the main freight exit.`,
      distance: 650,
      type: 'depart',
      modifier: 'straight',
    },
    {
      id: 'step-merge',
      instruction: 'In 650 meters, merge onto NH-27 Guwahati Bypass Expressway.',
      distance: 650,
      type: 'merge',
      modifier: 'right',
    },
    {
      id: 'step-highway',
      instruction: 'Stay on the expressway for 8.4 kilometers. Optimal speed 55 km/h for lowest CO₂.',
      distance: 8400,
      type: 'straight',
      modifier: 'straight',
    },
  ];

  // If there are intermediate waypoints, insert waypoint instructions
  if (waypoints && waypoints.length > 0) {
    waypoints.forEach((wp, idx) => {
      steps.push({
        id: `step-wp-${idx}`,
        instruction: `In 1.2 kilometers, take the exit for Intermediate Stop: ${wp.name || `Stop #${idx + 1}`}.`,
        distance: 1200,
        type: 'turn-left',
        modifier: 'left',
      });
      steps.push({
        id: `step-wp-arrive-${idx}`,
        instruction: `Arriving at ${wp.name || `Stop #${idx + 1}`}. Verify cargo seal on arrival.`,
        distance: 300,
        type: 'arrive',
        modifier: '',
      });
    });
  } else {
    // Standard river bridge / corridor maneuver
    steps.push({
      id: 'step-bridge',
      instruction: 'In 2.5 kilometers, keep right onto Saraighat Bridge River Crossing corridor.',
      distance: 2500,
      type: 'keep-right',
      modifier: 'right',
    });
  }

  steps.push({
    id: 'step-final-turn',
    instruction: `In 800 meters, turn right toward ${destName} freight gates.`,
    distance: 800,
    type: 'turn-right',
    modifier: 'right',
  });

  steps.push({
    id: 'step-arrive-final',
    instruction: `You have reached your destination: ${destName}. Trip completed!`,
    distance: 0,
    type: 'arrive',
    modifier: '',
  });

  return steps;
}
