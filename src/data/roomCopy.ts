// Client-facing copy for every room: a short purpose and 2–3 "Design notes".
// Written to match src/data/layout.ts (doors, adjacencies) — if a door moves, re-read the notes for that room.
// No metrics: the only numbers used are facts of the plan itself (door counts, station counts, exit counts).
import type { RoomCopy, RoomId } from './types';

export const ROOM_COPY: Record<RoomId, RoomCopy> = {
  stair: {
    purpose: 'The escape stair, tucked into the north-west corner. One door, one purpose: a protected way out.',
    notes: [
      'Enclosed behind a single door onto the top corridor, so the stair stays separate from the working floor.',
      'At the west end of the full-width top corridor: everyone on the north side has a clear run to it.',
      'Plain concrete underfoot: hard-wearing and non-combustible.',
    ],
  },

  veg: {
    purpose: 'Where every vegetarian dish begins. Green boards, green bins and a green floor keep the room visibly its own.',
    notes: [
      'Its own door onto the top corridor and solid walls on both sides: no way through to the neighbouring rooms.',
      'Ingredients reach this door along the top corridor from Receiving and the stores.',
      'A ribbon window high on the north wall brings in daylight and leaves the wall below free for benches.',
    ],
  },

  jain: {
    purpose: 'Jain cooking follows its own strict ingredient rules. This yellow room gives it a bench, boards and bins that no other diet touches.',
    notes: [
      'Sits between Veg and Vegan prep, with a solid wall on each side and its only door on the top corridor.',
      'Yellow on the floor, the boards and the bins: staff can tell at a glance whose room they are in.',
      'Prepped food goes out by that door and along the corridor to the kitchen’s north doors.',
    ],
  },

  vegan: {
    purpose: 'Plant-based food, prepared with no animal product anywhere near it. Purple boards and bins make the rule easy to see.',
    notes: [
      'A solid east wall separates it from Non-Veg Prep, the one neighbour it most needs to stay clear of.',
      'Its door lines up closely with a kitchen door across the corridor: the shortest trip of the four prep rooms.',
      'Purple floor, boards and bins, with a ribbon window high on the north wall for daylight.',
    ],
  },

  nonveg: {
    purpose: 'Meat, poultry and fish are cut and cleaned here, and only here. Red boards and bins mark the room.',
    notes: [
      'The widest of the four prep rooms, so cutting, trimming and washing do not crowd each other.',
      'A solid east wall keeps raw meat apart from the Bakery next door.',
      'Red on the floor, boards and bins. One door, onto the top corridor, and nothing else leads in.',
    ],
  },

  bakery: {
    purpose: 'A bakery of its own for breads and bakes, with a double door wide enough for loaded rolling racks.',
    notes: [
      'Spiral mixer, proofer and deck ovens, with rolling racks to carry trays between them.',
      'The double door opens onto the top corridor, across from the kitchen’s wider north door.',
      'Its own room, apart from the hot kitchen: oven heat and flour dust stay put. A ribbon window adds daylight.',
    ],
  },

  cold: {
    purpose: 'Chilled storage for all four diets under one roof. Each fridge wears its zone colour, so stock stays where it belongs.',
    notes: [
      'Four tall fridges, one per diet, in the zone colours: green, yellow, purple and red.',
      'A walk-in door leads to bulk chilled stock. The room’s single door faces the top corridor.',
      'A steel floor finish washes down easily and reads clearly as cold, clean space.',
    ],
  },

  dry: {
    purpose: 'Shelf-stable goods live here: three rows of steel shelving, stocked in crates, with a private door straight from Receiving.',
    notes: [
      'A direct door to Receiving: dry stock goes in without ever entering the corridor.',
      'A second door onto the top corridor sends stock out to prep and the kitchen.',
      'Crates on steel shelves, kept off the floor: easy to clean around and easy to inspect.',
    ],
  },

  lift: {
    purpose: 'Where the Raw Material route begins. Deliveries arrive at the north-east corner and step out directly into Receiving.',
    notes: [
      'Its only door opens into Receiving, so nothing reaches storage or the kitchen without being inspected.',
      'Deliveries enter at the north-east corner; staff enter at the south-east. The two never share an entrance.',
    ],
  },

  recv: {
    purpose: 'Every delivery stops here first. Goods are checked in, inspected, and only then sent on to storage or prep.',
    notes: [
      'Three doors, three jobs: the lift in, dry storage alongside, the top corridor out.',
      'Inspection comes before storage, so a problem is caught at the door, not on a shelf.',
      'From here raw material travels west along the top corridor to cold storage, prep and the kitchen.',
    ],
  },

  dessert: {
    purpose: 'A cool, dedicated room for desserts, kept apart from the hot line. Two freezers and a marble counter do the work.',
    notes: [
      'Two doors only: ingredients arrive from the left corridor, finished desserts leave south into Packing.',
      'Marble stays cool under the hand, which suits sugar, chocolate and pastry.',
      'Both freezers are in the room, so set desserts wait here until they are ready to pack.',
    ],
  },

  pack: {
    purpose: 'The checkpoint between kitchen and customer. Hot food and desserts meet at one packing table and pass a QC lamp.',
    notes: [
      'Three doors: desserts arrive from the north, hot food from the bottom corridor, orders leave to Dispatch.',
      'A central table lets packers work from every side and keep each order together.',
      'The QC lamp over the table gives each order a final look under proper light.',
    ],
  },

  kitchen: {
    purpose: 'The heart of the plan. A back cooking line, a wok station and four cuisine islands, with a long pass counter handing food out.',
    notes: [
      'Four islands: Indian (tandoor), Chinese (wok burners), Continental (flat-top) and European (ranges).',
      'One continuous stainless hood overhead; the gas ring main has an emergency shut-off at the west door.',
      'Ingredients enter from the top corridor; finished dishes leave through the pass window to the bottom corridor.',
    ],
  },

  dish: {
    purpose: 'Every dirty dish returns here and leaves clean. Five stages, one direction, from dirty collection to storage.',
    notes: [
      'On the return corridor, straight across from the kitchen’s east door: dirty ware skips the cooking floor.',
      'Stages run in order: dirty collection, wash, sanitize, dry, storage.',
      'A second door onto the staff spine lets dish staff come and go without entering the kitchen.',
    ],
  },

  dispatch: {
    purpose: 'The last stop on the Orders Out route. Packed orders are handed over here and leave by a double door.',
    notes: [
      'Packing & QC feeds it directly through a connecting door, so a checked order goes straight to hand-over.',
      'The double door opens onto the Delivery Partners Pickup Zone, where a cantilevered canopy gives cover.',
      'An emergency exit at the west end, apart from the double door, and a door through to Rider Waiting.',
    ],
  },

  rider: {
    purpose: 'A comfortable place for delivery partners to wait, charge and collect, so nobody hovers at the kitchen door.',
    notes: [
      'Benches, charging lockers and a screen: the basics, done properly.',
      'A timber floor sets it apart from the working rooms and makes waiting feel like hospitality.',
      'A door to Dispatch and one straight outside give riders a direct route in and out.',
    ],
  },

  waste: {
    purpose: 'The Dirty route ends here. Waste is sorted into six colour-coded bins and leaves through its own service door.',
    notes: [
      'Six colour-coded bins keep each waste stream apart from the moment it arrives.',
      'Two doors from the bottom corridor let the dirty-utensil trolley enter and leave without reversing.',
      'A service door opens straight outside, so waste leaves the building without retracing its steps.',
    ],
  },

  garden: {
    purpose: 'A green pause in a working building. Planter beds, trees and a bench, lit through glass on two sides.',
    notes: [
      'Glazed north and south: daylight comes through, and the planting is visible from the bottom corridor.',
      'A glazed double door off the bottom corridor makes it part of the route, not a detour.',
      'Trees, planter beds and a bench soften a building of steel and tile, and give staff somewhere to reset.',
    ],
  },

  lockers: {
    purpose: 'Where staff change into uniform and leave their bags behind, before anyone goes near food.',
    notes: [
      'One door, onto the staff spine. Nothing connects it to a food room.',
      'The top corridor begins just beyond the north end of the spine: from changing to work with no detour.',
      'On the olive Staff route of the plan, this is where everyday clothes become uniform.',
    ],
  },

  elec: {
    purpose: 'The building’s power room. UPS cabinets and a cable tray keep the equipment running and the wiring in one place.',
    notes: [
      'Entered only from the staff spine, so engineers reach it without passing through a kitchen.',
      'UPS cabinets carry key equipment through a power cut.',
      'Concrete floor and a cable tray: robust, serviceable, nothing decorative.',
    ],
  },

  creator: {
    purpose: 'A corner built for filming. A teal backdrop, ring light and camera turn the kitchen’s story into content.',
    notes: [
      'Teal backdrop wall, ring light, camera and a round table: ready to shoot.',
      'First room along the spine from the Staff Entrance, behind a glass partition that shows the shoot.',
      'Blue is its own fifth zone, outside the four diet colours. A glowing kitchen-name sign marks the spot.',
    ],
  },

  toilets: {
    purpose: 'Separate male and female toilets, entered from the staff lobby rather than from any working room.',
    notes: [
      'One door off the lobby, split into male and female inside.',
      'Close to the Staff Entrance, and at the opposite corner of the plan from the prep rooms.',
    ],
  },

  exit: {
    purpose: 'A short, clear path from the staff route to the outside. Green EXIT sign above, outward-opening door ahead.',
    notes: [
      'The door opens outward, so a crowd pushes it open instead of jamming it.',
      'Next to the Staff Entrance, the logo door, but a separate door: the escape route is never the daily one.',
      'With the Dispatch exit it makes two emergency exits, at opposite ends of the south wall.',
    ],
  },
};
