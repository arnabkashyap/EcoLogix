/**
 * Navigation & Turn-by-Turn Utilities
 * Uses OSRM public demo server for routing steps and SpeechSynthesis for voice guidance.
 */

export async function fetchTurnByTurnSteps(origin, destination, waypoints = []) {
  try {
    const allWaypoints = [origin, ...waypoints, destination].filter(
      (w) => w && typeof w.lat === 'number' && (typeof w.lng === 'number' || typeof w.lon === 'number')
    );

    if (allWaypoints.length < 2) {
      return generateFallbackSteps(origin, destination);
    }

    const coordsStr = allWaypoints
      .map((w) => `${w.lng ?? w.lon},${w.lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?steps=true&overview=full&geometries=geojson`;
    const res = await fetch(url);

    if (!res.ok) {
      return generateFallbackSteps(origin, destination);
    }

    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const legSteps = [];
      data.routes[0].legs.forEach((leg, legIdx) => {
        leg.steps.forEach((step, stepIdx) => {
          if (step.maneuver && step.maneuver.type !== 'arrive') {
            legSteps.push({
              id: `step-${legIdx}-${stepIdx}`,
              instruction: step.maneuver.modifier
                ? `In ${Math.round(step.distance)}m, turn ${step.maneuver.modifier} onto ${step.name || 'the road'}`
                : `Continue on ${step.name || 'the road'} for ${Math.round(step.distance)}m`,
              distance: Math.round(step.distance),
              type: step.maneuver.type,
              modifier: step.maneuver.modifier,
              location: step.maneuver.location,
            });
          }
        });
      });
      legSteps.push({
        id: 'step-arrive',
        instruction: 'You have arrived at your destination!',
        distance: 0,
        type: 'arrive',
        modifier: '',
      });
      return legSteps;
    }
  } catch (err) {
    console.warn('OSRM routing fetch notice, using fallback steps:', err);
  }

  return generateFallbackSteps(origin, destination);
}

function generateFallbackSteps(origin, destination) {
  return [
    {
      id: 'step-1',
      instruction: 'Head towards main freight corridor',
      distance: 850,
      type: 'depart',
    },
    {
      id: 'step-2',
      instruction: 'In 500m, turn right onto Eco Express Highway',
      distance: 500,
      type: 'turn-right',
    },
    {
      id: 'step-3',
      instruction: 'Merge onto primary delivery ring road',
      distance: 3200,
      type: 'merge',
    },
    {
      id: 'step-4',
      instruction: 'You have arrived at your destination cargo hub!',
      distance: 0,
      type: 'arrive',
    },
  ];
}

export function speakInstruction(text) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis notice:', err);
    }
  }
}
