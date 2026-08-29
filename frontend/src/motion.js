/**
 * motion.js — EcoLogix shared Framer Motion variant library
 *
 * JS mirrors of the CSS custom properties defined in index.css :root.
 * Framer Motion resolves variant values at runtime and cannot read
 * CSS custom properties, so we keep a single JS source here and
 * reference it from both AdminDashboard and Mobile components.
 *
 * Constraint: every variant must animate ONLY transform (x / y / scale)
 * and opacity.  width / height / top / left are never animated.
 */

// -- Mirror of CSS motion tokens ---------------------------------------------
// Keep in sync with the :root block in index.css.

/** M3 "Emphasized" easing - fast start, gentle settle */
export const EASE_EMPHASIZED = [0.2, 0, 0, 1];

/** Standard panel / card entrance (300 ms) */
export const DURATION_STANDARD = 0.3;

/** Drawer / sheet slide (350 ms) */
export const DURATION_DRAWER = 0.35;

/** Micro-interaction - hover chip, badge pop (150 ms) */
export const DURATION_MICRO = 0.15;


// -- Shared transition presets -----------------------------------------------

const transitionDrawer = {
  duration: DURATION_DRAWER,
  ease: EASE_EMPHASIZED,
};

const transitionStandard = {
  duration: DURATION_STANDARD,
  ease: EASE_EMPHASIZED,
};

const transitionMicro = {
  duration: DURATION_MICRO,
  ease: EASE_EMPHASIZED,
};


// -- Drawer variants ---------------------------------------------------------

/**
 * Desktop panel / sidebar that slides in from the right edge.
 * Pair with AnimatePresence; set the parent overflow to "hidden" so the
 * exiting panel does not scroll the page.
 *
 * @example
 * <AnimatePresence>
 *   {open && (
 *     <motion.div
 *       variants={drawerVariantsDesktop}
 *       initial="hidden"
 *       animate="visible"
 *       exit="exit"
 *     />
 *   )}
 * </AnimatePresence>
 */
export const drawerVariantsDesktop = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: transitionDrawer,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      ...transitionDrawer,
      // Slightly faster exit feels snappier
      duration: DURATION_STANDARD,
    },
  },
};

/**
 * Mobile bottom-sheet that slides up from the viewport bottom.
 * Works for full-screen flow screens (DriverTripFlow states) and
 * half-height sheets alike - the component controls its own height.
 */
export const drawerVariantsMobile = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: transitionDrawer,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      ...transitionDrawer,
      duration: DURATION_STANDARD,
    },
  },
};


// -- Fade-out variant --------------------------------------------------------

/**
 * Pure opacity fade - for items that are filtered out or deselected.
 * Scale held at 1 (no layout shift); only opacity changes.
 * Use with AnimatePresence when removing items from a list.
 */
export const fadeOutVariant = {
  hidden: {
    opacity: 0,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitionStandard,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: transitionMicro,
  },
};


// -- Stagger container + item ------------------------------------------------

/**
 * Wrap a list with staggerContainer, give each child staggerItem.
 * The container itself has no layout effect; only children animate.
 *
 * @example
 * <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
 *   {items.map(item => (
 *     <motion.li key={item.id} variants={staggerItem}>...</motion.li>
 *   ))}
 * </motion.ul>
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

/**
 * Individual list item - slides up 16 px and fades in.
 * 16 px is small enough for dense data tables; large enough to convey sequence.
 */
export const staggerItem = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionStandard,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: transitionMicro,
  },
};
